import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  addApplication,
  createFixtureSocialing,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
  type FixtureOptions,
} from "./helpers/supabase";

// MS15 U4 보이는 상태 (04 2.4, architecture 3.2): socialing_display_status와 뷰 끝 칸
// display_status · cancel_reason · needed_count · status_tag, 신청 취소 창(O05) 판단 칸 cancel_would_auto_cancel · cancel_would_be_late.
// 저장된 상태는 그대로이고 신청 마감·확정 기한이 지나면 보이는 상태만 계산으로 바뀐다(예약 작업 없음).
// 테스트 소셜링은 직접 넣어 지난 신청 마감·확정 기한을 만든다(등록 함수의 12시간 검사에 걸리지 않음, 04 8.3).

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Omit<FixtureOptions, "host"> & { host?: FixtureOptions["host"] }) {
  const id = await createFixtureSocialing({ host: "C", capacity: 6, ...options });
  created.push(id);
  return id;
}

type Summary = {
  status: string;
  display_status: string;
  cancel_reason: string | null;
  needed_count: number | null;
  status_tag: string | null;
  min_participants: number;
  confirm_deadline_at: string;
  can_apply: boolean;
};

/** 비로그인으로 socialing_summaries 한 줄 (목록·상세가 읽는 칸) */
async function summaryOf(request: APIRequestContext, id: number) {
  const { status, rows } = await readAs<Summary & Record<string, unknown>>(
    request,
    `socialing_summaries?select=*&id=eq.${id}`,
  );
  expect(status).toBe(200);
  return rows[0];
}

const pick = ({ status, display_status, cancel_reason, needed_count, status_tag }: Summary) => ({
  status,
  display_status,
  cancel_reason,
  needed_count,
  status_tag,
});

test.describe("MS15 보이는 상태 (2.4 표, 조합 10가지)", () => {
  test("신청 마감 전: 최소 인원 전이면 남은 수, 넘으면 0, 정원이 차면 정원 마감. 모두 모집중", async ({ request }) => {
    const [below, reached, full] = await Promise.all([
      fixture({ minParticipants: 4, accepted: ["P1"] }),
      fixture({ minParticipants: 2, accepted: ["P1", "P2"] }),
      fixture({ capacity: 2, accepted: ["P1", "P2"] }),
    ]);
    expect(pick(await summaryOf(request, below))).toEqual({
      status: "recruiting",
      display_status: "recruiting",
      cancel_reason: null,
      needed_count: 3,
      status_tag: null,
    });
    expect(pick(await summaryOf(request, reached))).toMatchObject({ display_status: "recruiting", needed_count: 0, status_tag: null });
    expect(pick(await summaryOf(request, full))).toMatchObject({ display_status: "recruiting", needed_count: 0, status_tag: "full" });
    // 최소 인원·확정 기한은 누구나 본다
    expect(await summaryOf(request, below)).toMatchObject({ min_participants: 4, can_apply: true });
  });

  test("신청 마감 지남: 참여 확정 + 승인 대기가 최소 인원보다 적으면 취소, 아니면 확정 대기, 확정 기한이 지나면 호스트 취소", async ({
    request,
  }) => {
    const [canceled, awaiting, expired] = await Promise.all([
      // 참여 확정 1 + 승인 대기 1 < 최소 3
      fixture({ joinType: "approval", minParticipants: 3, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1"] }),
      // 참여 확정 1 + 승인 대기 2 = 최소 3 → 호스트가 승인해 채울 수 있다
      fixture({ joinType: "approval", minParticipants: 3, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1"] }),
      // 확정 대기인 채로 확정 기한이 지남
      fixture({ deadlineInHours: -3, confirmInHours: -1, accepted: ["P1", "P2"] }),
    ]);
    await Promise.all([
      addApplication(canceled, "P2", "pending"),
      addApplication(awaiting, "P2", "pending"),
      addApplication(awaiting, "P3", "pending"),
    ]);

    expect(pick(await summaryOf(request, canceled))).toEqual({
      status: "recruiting",
      display_status: "auto_canceled",
      cancel_reason: "min_not_met",
      needed_count: null,
      status_tag: null,
    });
    // 확정 대기: 꼬리표 없음(2.4), 최소 인원까지 남은 수는 상세 보조 글용(승인 대기 중 2명이 더 승인되면)
    expect(pick(await summaryOf(request, awaiting))).toEqual({
      status: "recruiting",
      display_status: "awaiting_confirm",
      cancel_reason: null,
      needed_count: 2,
      status_tag: null,
    });
    expect(pick(await summaryOf(request, expired))).toEqual({
      status: "recruiting",
      display_status: "host_canceled",
      cancel_reason: "not_confirmed",
      needed_count: null,
      status_tag: null,
    });
    // 승인 대기 숫자는 공개 칸으로 내지 않는다 (승인 대기는 호스트만 읽음)
    expect(Object.keys(await summaryOf(request, awaiting)).some((key) => key.includes("pending"))).toBe(false);
  });

  test("확정은 지금 그대로(확정 + 신청 마감 · 정원 마감), 종료·호스트 취소(직접)도 그대로. 확정 뒤 적어져도 확정 유지", async ({
    request,
  }) => {
    const [closed, confirmedFull, fewer, completed, hostCanceled] = await Promise.all([
      fixture({ status: "confirmed", deadlineInHours: -2, accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", capacity: 2, accepted: ["P1", "P2"] }),
      // 최소 4명인데 참여 확정 1명 (확정 뒤 취소가 나온 경우)
      fixture({ status: "confirmed", minParticipants: 4, deadlineInHours: -2, accepted: ["P1"] }),
      fixture({ status: "completed", deadlineInHours: -30, startsInHours: -24, accepted: ["P1"] }),
      fixture({ status: "canceled", accepted: ["P1"] }),
    ]);
    expect(pick(await summaryOf(request, closed))).toEqual({
      status: "confirmed",
      display_status: "confirmed",
      cancel_reason: null,
      needed_count: null,
      status_tag: "closed",
    });
    expect(pick(await summaryOf(request, confirmedFull))).toMatchObject({ display_status: "confirmed", status_tag: "full" });
    expect(pick(await summaryOf(request, fewer))).toMatchObject({ display_status: "confirmed", needed_count: null });
    expect(pick(await summaryOf(request, completed))).toEqual({
      status: "completed",
      display_status: "completed",
      cancel_reason: null,
      needed_count: null,
      status_tag: null,
    });
    expect(pick(await summaryOf(request, hostCanceled))).toEqual({
      status: "canceled",
      display_status: "host_canceled",
      cancel_reason: "host",
      needed_count: null,
      status_tag: null,
    });
  });

  test("옛 '확정 안 된 채 일시 지남'은 취소(신청 없음)나 호스트 취소(최소 인원이 모였음)가 된다", async ({ request }) => {
    const [empty, gathered] = await Promise.all([
      fixture({ deadlineInHours: -26, startsInHours: -2 }),
      fixture({ deadlineInHours: -26, startsInHours: -2, accepted: ["P1", "P2"] }),
    ]);
    expect(pick(await summaryOf(request, empty))).toMatchObject({ status: "recruiting", display_status: "auto_canceled", cancel_reason: "min_not_met" });
    expect(pick(await summaryOf(request, gathered))).toMatchObject({ status: "recruiting", display_status: "host_canceled", cancel_reason: "not_confirmed" });
  });

  test("확정 대기에서 참가자 취소·거절로 최소 인원이 될 수 없으면 그 순간 취소가 되고 되돌아가지 않는다", async ({ request }) => {
    const id = await fixture({ joinType: "approval", minParticipants: 2, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1"] });
    const pending = await addApplication(id, "P2", "pending");
    expect((await summaryOf(request, id)).display_status).toBe("awaiting_confirm");

    // 호스트(C)가 승인 대기를 거절 → 1 < 2
    const host = await signIn(request, "C");
    const result = await rpc(request, "reject_application", { p_application_id: pending, p_reason: "criteria" }, host);
    expect(result.status).toBe(200);
    expect((await summaryOf(request, id)).display_status).toBe("auto_canceled");
    // 새 신청은 마감이 지나 들어올 수 없으므로 다시 확정 대기가 되지 않는다
    const apply = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, await signIn(request, "P3"));
    expect(apply.body.message).toBe("DEADLINE_PASSED");
    expect((await summaryOf(request, id)).display_status).toBe("auto_canceled");
  });
});

test.describe("MS15 socialing_display_status 둘째 인자 (O05 경고, 3.5)", () => {
  test("내 신청을 뺀 상태: 부른 사람 본인의 신청일 때만 뺀다(남의 신청 id를 줘도 그대로)", async ({ request }) => {
    const id = await fixture({ joinType: "approval", minParticipants: 3, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1"] });
    const [p2, p3] = await Promise.all([addApplication(id, "P2", "pending"), addApplication(id, "P3", "pending")]);
    const [asP2, asP1] = await Promise.all([signIn(request, "P2"), signIn(request, "P1")]);

    const call = (args: Record<string, unknown>, token?: string) =>
      rpc(request, "socialing_display_status", { p_socialing_id: id, ...args }, token);
    expect((await call({})).body).toBe("awaiting_confirm");
    expect((await call({ p_without_application_id: p2 }, asP2)).body).toBe("auto_canceled");
    // 남의 신청을 빼 달라고 해도 빼지 않는다 (승인 대기 수를 알아낼 수 없게)
    expect((await call({ p_without_application_id: p3 }, asP1)).body).toBe("awaiting_confirm");
    expect((await call({ p_without_application_id: p2 })).body).toBe("awaiting_confirm");
  });

  test("my_applied_socialings: 확정 대기 취소 경고와 늦은 취소 안내 판단", async ({ request }) => {
    const [tight, roomy, confirmedClosed, open] = await Promise.all([
      // 참여 확정 1(P1) + 승인 대기 1(P2) = 최소 2: 누가 취소하든 취소된다
      fixture({ joinType: "approval", minParticipants: 2, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1"] }),
      // 참여 확정 3 = 최소 2보다 많음: 한 명 취소해도 확정 대기
      fixture({ minParticipants: 2, deadlineInHours: -1, confirmInHours: 6, accepted: ["P1", "P2", "P3"] }),
      fixture({ status: "confirmed", deadlineInHours: -1, accepted: ["P1", "P2"] }),
      // 신청 마감 전: 취소해도 늦은 취소가 아니다
      fixture({ minParticipants: 2, accepted: ["P1"] }),
    ]);
    await addApplication(tight, "P2", "pending");
    const [asP1, asP2] = await Promise.all([signIn(request, "P1"), signIn(request, "P2")]);

    type Row = { id: number; application_status: string; cancel_would_auto_cancel: boolean; cancel_would_be_late: boolean };
    const mine = async (token: string) =>
      (
        await readAs<Row>(
          request,
          `my_applied_socialings?select=id,application_status,cancel_would_auto_cancel,cancel_would_be_late&id=in.(${tight},${roomy},${confirmedClosed},${open})`,
          token,
        )
      ).rows;
    const p1 = await mine(asP1);
    const p2 = await mine(asP2);
    const row = (rows: Row[], id: number) => rows.find((r) => r.id === id);

    expect(row(p1, tight)).toMatchObject({ application_status: "accepted", cancel_would_auto_cancel: true, cancel_would_be_late: true });
    // 승인 대기 취소는 늦은 취소가 아니다 (참여 확정이 아니었음)
    expect(row(p2, tight)).toMatchObject({ application_status: "pending", cancel_would_auto_cancel: true, cancel_would_be_late: false });
    expect(row(p1, roomy)).toMatchObject({ cancel_would_auto_cancel: false, cancel_would_be_late: true });
    // 확정 소셜링은 취소되지 않지만, 마감 뒤 참여 확정 취소는 늦은 취소
    expect(row(p1, confirmedClosed)).toMatchObject({ cancel_would_auto_cancel: false, cancel_would_be_late: true });
    expect(row(p1, open)).toMatchObject({ cancel_would_auto_cancel: false, cancel_would_be_late: false });
  });
});

test("확정 기한·최소 인원 칸: 테이블 제약 (2 ≤ 최소 인원 ≤ 정원, 신청 마감 ≤ 확정 기한 ≤ 소셜링 일시)", async () => {
  const id = await fixture({});
  const violates = async (set: string) => {
    try {
      await runQuery(`update public.socialings set ${set} where id = ${id};`);
      return false;
    } catch {
      return true;
    }
  };
  expect(await violates("min_participants = 1")).toBe(true);
  expect(await violates("min_participants = capacity + 1")).toBe(true);
  expect(await violates("confirm_deadline_at = apply_deadline_at - interval '1 minute'")).toBe(true);
  expect(await violates("confirm_deadline_at = starts_at + interval '1 minute'")).toBe(true);
  expect(await violates("confirm_deadline_at = null")).toBe(true);
  // 12시간은 함수에서만 본다 (이미 있는 행 때문에, 04 2.3)
  expect(await violates("confirm_deadline_at = starts_at")).toBe(false);
});
