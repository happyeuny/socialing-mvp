import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  addApplication,
  apiHeaders,
  applicationsOf,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
  socialingStateOf,
  supabaseUrl,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS15 U4 버튼 규칙 (04 2.5·2.6, architecture 5장): 확정은 확정 기한 전 + 참여 확정 ≥ 최소 인원(MIN_NOT_MET),
// 계산으로 취소·호스트 취소면 확정·승인·거절·신청 취소·호스트 취소가 모두 막힌다(AUTO_CANCELED).
// 관리 화면 칸(my_hosted_socialings)도 같은 규칙. 호스트 기록은 "확정 대기인 채로 확정 기한 지남"만 호스트 취소에 더한다.
// 호스트 C의 테스트 소셜링을 쓰고, 호스트 기록은 전용 호스트 계정으로 센다.

const created: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

async function fixture(options: Omit<FixtureOptions, "host"> & { host?: FixtureOptions["host"] }) {
  const id = await createFixtureSocialing({ host: "C", capacity: 6, ...options });
  created.push(id);
  return id;
}

/** 확정 대기: 신청 마감 1시간 전에 지남, 확정 기한 6시간 뒤 */
const AWAITING = { deadlineInHours: -1, confirmInHours: 6 } as const;
/** 확정 대기인 채로 확정 기한이 지남 → 호스트 취소(계산) */
const EXPIRED = { deadlineInHours: -3, confirmInHours: -1 } as const;
/** 신청 마감 때 최소 인원이 될 수 없음 → 취소(계산) */
const AUTO_CANCELED = { deadlineInHours: -1, confirmInHours: 6 } as const;

type Managed = {
  can_confirm: boolean;
  confirm_blocked_reason: string | null;
  complete_blocked_reason: string | null;
  can_cancel: boolean;
  can_edit: boolean;
  can_decide: boolean;
  can_approve: boolean;
  approve_blocked_reason: string | null;
  display_status: string;
};

async function managedOf(request: APIRequestContext, token: string, id: number) {
  const { rows } = await readAs<Managed>(
    request,
    `my_hosted_socialings?select=can_confirm,confirm_blocked_reason,complete_blocked_reason,can_cancel,can_edit,can_decide,can_approve,approve_blocked_reason,display_status&id=eq.${id}`,
    token,
  );
  return rows[0];
}

const message = (result: { body: { message?: string } }) => result.body.message;

test.describe("MS15 확정하기 (결정 H4)", () => {
  test("참여 확정이 최소 인원보다 적으면 MIN_NOT_MET, 채우면 확정된다 (모집중·확정 대기 모두)", async ({ request }) => {
    const host = await signIn(request, "C");
    const [recruiting, awaiting] = await Promise.all([
      fixture({ minParticipants: 3, accepted: ["P1", "P2"] }),
      // 3단계 → 5단계 흐름: 참여 확정 1 + 승인 대기 1 = 최소 2, 승인하면 확정할 수 있다
      fixture({ joinType: "approval", minParticipants: 2, ...AWAITING, accepted: ["P1"] }),
    ]);
    const pending = await addApplication(awaiting, "P2", "pending");

    for (const id of [recruiting, awaiting]) {
      expect(message(await rpc(request, "confirm_socialing", { p_socialing_id: id }, host))).toBe("MIN_NOT_MET");
      expect(await managedOf(request, host, id)).toMatchObject({ can_confirm: false, confirm_blocked_reason: "min_not_met" });
      expect((await socialingStateOf(id)).status).toBe("recruiting");
    }

    // 모집중: 한 명 더 참여 확정되면 확정
    await addApplication(recruiting, "P3", "accepted");
    expect(await managedOf(request, host, recruiting)).toMatchObject({ can_confirm: true, confirm_blocked_reason: null });
    expect((await rpc(request, "confirm_socialing", { p_socialing_id: recruiting }, host)).status).toBe(200);

    // 확정 대기: 승인 대기를 승인하면 최소 인원이 되어 확정 (확정 대기 중에도 승인할 수 있다)
    expect(await managedOf(request, host, awaiting)).toMatchObject({ display_status: "awaiting_confirm", can_approve: true });
    expect((await rpc(request, "decide_application", { p_application_id: pending, p_approve: true }, host)).status).toBe(200);
    expect(await managedOf(request, host, awaiting)).toMatchObject({ can_confirm: true });
    expect((await rpc(request, "confirm_socialing", { p_socialing_id: awaiting }, host)).status).toBe(200);
    expect((await socialingStateOf(awaiting)).status).toBe("confirmed");
  });

  test("확정 기한이 지났거나(호스트 취소) 최소 인원이 될 수 없으면(취소) AUTO_CANCELED", async ({ request }) => {
    const host = await signIn(request, "C");
    const [expired, canceled] = await Promise.all([
      fixture({ ...EXPIRED, accepted: ["P1", "P2"] }),
      fixture({ minParticipants: 3, ...AUTO_CANCELED, accepted: ["P1"] }),
    ]);
    for (const id of [expired, canceled]) {
      expect(message(await rpc(request, "confirm_socialing", { p_socialing_id: id }, host))).toBe("AUTO_CANCELED");
      expect((await socialingStateOf(id)).status).toBe("recruiting");
    }
  });
});

test.describe("MS15 계산으로 취소·호스트 취소된 소셜링 (2.5)", () => {
  test("승인·거절·신청 취소·호스트 취소가 모두 AUTO_CANCELED이고 아무것도 바뀌지 않는다", async ({ request }) => {
    const [host, p1] = await Promise.all([signIn(request, "C"), signIn(request, "P1")]);
    // 확정 기한 지남: 참여 확정 2 + 승인 대기 1
    const expired = await fixture({ joinType: "approval", ...EXPIRED, accepted: ["P1", "P2"] });
    // 최소 인원 미달: 참여 확정 1 + 승인 대기 1 < 최소 3
    const canceled = await fixture({ joinType: "approval", minParticipants: 3, ...AUTO_CANCELED, accepted: ["P1"] });
    const [expiredPending, canceledPending] = await Promise.all([
      addApplication(expired, "P3", "pending"),
      addApplication(canceled, "P2", "pending"),
    ]);

    for (const [id, pending] of [
      [expired, expiredPending],
      [canceled, canceledPending],
    ]) {
      const before = await applicationsOf(id);
      expect(message(await rpc(request, "decide_application", { p_application_id: pending, p_approve: true }, host))).toBe(
        "AUTO_CANCELED",
      );
      expect(
        message(await rpc(request, "reject_application", { p_application_id: pending, p_reason: "criteria" }, host)),
      ).toBe("AUTO_CANCELED");
      expect(message(await rpc(request, "cancel_socialing", { p_socialing_id: id }, host))).toBe("AUTO_CANCELED");
      const [mine] = (
        await readAs<{ application_id: number }>(request, `my_applied_socialings?select=application_id&id=eq.${id}`, p1)
      ).rows;
      expect(message(await rpc(request, "cancel_application", { p_application_id: mine.application_id }, p1))).toBe(
        "AUTO_CANCELED",
      );
      expect(await applicationsOf(id)).toEqual(before);
      expect((await socialingStateOf(id)).status).toBe("recruiting");

      // 관리 화면: 버튼이 모두 막히고 신청자 목록은 보기만 (막힌 이유 없이)
      expect(await managedOf(request, host, id)).toMatchObject({
        can_confirm: false,
        confirm_blocked_reason: "canceled",
        complete_blocked_reason: "not_confirmed",
        can_cancel: false,
        can_edit: false,
        can_decide: false,
        can_approve: false,
        approve_blocked_reason: null,
      });
    }
  });

  test("확정 대기 중에는 승인·거절·신청 취소·호스트 취소가 된다", async ({ request }) => {
    const [host, p1] = await Promise.all([signIn(request, "C"), signIn(request, "P1")]);
    const [forReject, forCancel, forHostCancel] = await Promise.all([
      fixture({ joinType: "approval", ...AWAITING, accepted: ["P1", "P2", "P3"] }),
      fixture({ ...AWAITING, accepted: ["P1", "P2", "P3"] }),
      fixture({ ...AWAITING, accepted: ["P1", "P2"] }),
    ]);
    const pending = await addApplication(forReject, "P4", "pending");
    expect(await managedOf(request, host, forHostCancel)).toMatchObject({
      display_status: "awaiting_confirm",
      can_cancel: true,
      can_edit: true,
      can_decide: true,
      can_confirm: true,
    });

    expect(
      (await rpc(request, "reject_application", { p_application_id: pending, p_reason: "full" }, host)).status,
    ).toBe(200);
    const [mine] = (
      await readAs<{ application_id: number }>(request, `my_applied_socialings?select=application_id&id=eq.${forCancel}`, p1)
    ).rows;
    expect((await rpc(request, "cancel_application", { p_application_id: mine.application_id }, p1)).status).toBe(200);
    expect((await rpc(request, "cancel_socialing", { p_socialing_id: forHostCancel }, host)).status).toBe(200);
    expect((await socialingStateOf(forHostCancel)).status).toBe("canceled");
  });

  test("확정 소셜링은 신청 마감·확정 기한이 지나도 소셜링 일시 전까지 승인할 수 있다 (그대로)", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ status: "confirmed", joinType: "approval", deadlineInHours: -3, accepted: ["P1", "P2"] });
    const pending = await addApplication(id, "P3", "pending");
    expect(await managedOf(request, host, id)).toMatchObject({ can_decide: true, can_approve: true, can_cancel: true });
    expect((await rpc(request, "decide_application", { p_application_id: pending, p_approve: true }, host)).status).toBe(200);
  });
});

test.describe("MS15 호스트 기록 (결정 H3)", () => {
  test("확정 대기인 채로 확정 기한이 지나면 호스트 취소 1회, 최소 인원 미달 취소는 세지 않는다", async ({ request }) => {
    const host = await createTestUser(request, "ms15-record");
    createdUsers.push(host);
    await Promise.all([
      fixture({ host, ...EXPIRED, accepted: ["P1", "P2"] }),
      fixture({ host, minParticipants: 3, ...AUTO_CANCELED, accepted: ["P1"] }),
      // 신청 없이 일시가 지난 모집중 (옛 "확정 안 된 채 일시 지남") → 취소, 세지 않음
      fixture({ host, deadlineInHours: -26, startsInHours: -2 }),
      // 확정 대기는 아직 세지 않는다
      fixture({ host, ...AWAITING, accepted: ["P1", "P2"] }),
    ]);
    const response = await request.post(`${supabaseUrl}/rest/v1/rpc/get_host_record`, {
      headers: apiHeaders(),
      data: { p_host_id: host.id },
    });
    expect(response.status()).toBe(200);
    const [record] = await response.json();
    expect(record).toMatchObject({ opened_count: 0, canceled_count: 1, is_trusted_host: false });
  });
});
