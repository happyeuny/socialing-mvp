import { expect, test } from "@playwright/test";
import type { DemoUserKey } from "../../scripts/seed-data.mts";
import {
  addApplication,
  applicationsOf,
  callInDbHolding,
  createFixtureSocialing,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
  socialingStateOf,
} from "./helpers/supabase";

// MS4 호스트 함수: decide_application, confirm_socialing, complete_socialing, cancel_socialing
// (architecture 5장, spec 3.1·3.3·M8·8.8)와 관리 화면 읽기(my_hosted_socialings 관리 칸, hosted_socialing_applicants).
// 시드 데이터는 건드리지 않고, 호스트 C의 테스트 전용 소셜링을 만들고 지운다.
// MS15: 거절은 사유를 받는 reject_application만(옛 거절 길 decide_application(…, false)은 지움), 확정은 참여 확정 ≥ 최소 인원(기본 2),
// 확정하지 않은 채 확정 기한(= 테스트 소셜링 기본은 신청 마감)이 지난 모집중은 계산으로 취소·호스트 취소라 모든 버튼이 막힌다.
// 새 규칙 자체는 ms15-host-actions-fn.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

// 확정한 채 일시가 지난 소셜링 (7단계의 X와 같은 상태)
const STARTED = { deadlineInHours: -3, startsInHours: -1 } as const;

test.describe("MS4 decide_application 승인·거절", () => {
  test("승인하면 참여 확정, 거절하면 거절. 바뀐 신청 행을 돌려준다", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ host: "C", joinType: "approval", capacity: 4 });
    const p1 = await addApplication(id, "P1", "pending");
    const p2 = await addApplication(id, "P2", "pending");

    const approved = await rpc(request, "decide_application", { p_application_id: p1, p_approve: true }, host);
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({ id: p1, status: "accepted" });

    const rejected = await rpc(request, "reject_application", { p_application_id: p2, p_reason: "criteria" }, host);
    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({ id: p2, status: "rejected" });

    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["accepted", "rejected"]);
  });

  test("거절된 사람은 다시 신청할 수 있고, 새 신청을 승인할 수 있다 (spec 3.3)", async ({ request }) => {
    const [host, p1] = await Promise.all([signIn(request, "C"), signIn(request, "P1")]);
    const id = await fixture({ host: "C", joinType: "approval" });
    const first = await addApplication(id, "P1", "pending");
    await rpc(request, "reject_application", { p_application_id: first, p_reason: "criteria" }, host);

    const again = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1);
    expect(again.body.status).toBe("pending");
    const approved = await rpc(request, "decide_application", { p_application_id: again.body.id, p_approve: true }, host);
    expect(approved.body.status).toBe("accepted");
  });

  test("완료 기준: 호스트가 아니면 함수가 거부한다 (신청자 본인, 다른 호스트, 비로그인)", async ({ request }) => {
    const [p1, other] = await Promise.all([signIn(request, "P1"), signIn(request, "D")]);
    const id = await fixture({ host: "C", joinType: "approval" });
    const application = await addApplication(id, "P1", "pending");

    for (const token of [p1, other]) {
      expect(
        (await rpc(request, "decide_application", { p_application_id: application, p_approve: true }, token)).body
          .message,
      ).toBe("NOT_HOST");
    }
    expect((await rpc(request, "decide_application", { p_application_id: application, p_approve: true })).status).not.toBe(
      200,
    );
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);
  });

  test("처리할 수 없으면 정해진 오류 코드를 돌려주고 아무것도 바꾸지 않는다", async ({ request }) => {
    const host = await signIn(request, "C");
    const decide = async (applicationId: number, approve = true) =>
      (await rpc(request, "decide_application", { p_application_id: applicationId, p_approve: approve }, host)).body
        .message;

    expect(await decide(-1)).toBe("INVALID_INPUT");

    // 준비는 한꺼번에 한다. 관리 API 쿼리가 하나에 2초 가까이 걸리는 때가 있어 하나씩 만들면 30초를 넘는다
    const [open, started, full, canceled] = await Promise.all([
      fixture({ host: "C", joinType: "approval", capacity: 6 }),
      fixture({ host: "C", joinType: "approval", status: "confirmed", ...STARTED }),
      fixture({ host: "C", joinType: "approval", capacity: 2, accepted: ["P4", "P5"] }),
      fixture({ host: "C", joinType: "approval", status: "canceled" }),
    ]);
    const [processed, late, waiting, onCanceled] = await Promise.all([
      Promise.all([
        addApplication(open, "P1", "accepted"),
        addApplication(open, "P2", "rejected"),
        addApplication(open, "P3", "canceled"),
      ]),
      addApplication(started, "P1", "pending"),
      addApplication(full, "P1", "pending"),
      addApplication(canceled, "P1", "pending"),
    ]);

    // 이미 처리된 신청 (참여 확정, 거절, 신청 취소): 창을 연 사이 신청자가 취소한 경우 등
    for (const [index, status] of (["accepted", "rejected", "canceled"] as const).entries()) {
      expect(await decide(processed[index]), status).toBe("ALREADY_PROCESSED");
    }

    // 소셜링 일시가 지남: 승인도 거절도 안 된다
    expect(await decide(late, true)).toBe("STARTED");
    expect(
      (await rpc(request, "reject_application", { p_application_id: late, p_reason: "criteria" }, host)).body.message,
    ).toBe("STARTED");

    // 정원이 참: 승인만 막히고 거절은 된다
    expect(await decide(waiting, true)).toBe("FULL");

    // 호스트 취소·종료된 소셜링의 승인 대기
    expect(await decide(onCanceled)).toBe("INVALID_STATE");

    expect((await applicationsOf(started)).map((a) => a.status)).toEqual(["pending"]);
    expect((await applicationsOf(full)).map((a) => a.status)).toEqual(["accepted", "accepted", "pending"]);

    const rejected = await rpc(request, "reject_application", { p_application_id: waiting, p_reason: "full" }, host);
    expect(rejected.status).toBe(200);
    expect((await applicationsOf(full)).map((a) => a.status)).toEqual(["accepted", "accepted", "rejected"]);
  });

  test("마지막 한 자리에 승인 두 개가 동시에 와도 하나만 참여 확정된다 (소셜링 행 잠금)", async () => {
    test.setTimeout(60_000);
    const id = await fixture({ host: "C", joinType: "approval", capacity: 2, accepted: ["P5"] });
    const p1 = await addApplication(id, "P1", "pending");
    const p2 = await addApplication(id, "P2", "pending");

    const first = callInDbHolding("C", `public.decide_application(${p1}, true)`, 2);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const second = await callInDbHolding("C", `public.decide_application(${p2}, true)`, 0);

    expect(await first).toBe("OK");
    expect(second).toBe("FULL");
    expect((await applicationsOf(id)).filter((a) => a.status === "accepted")).toHaveLength(2);
  });
});

test.describe("MS4 상태 버튼 함수 (spec 3.1)", () => {
  test("모집중 → 확정 → 종료: 확정은 일시 전, 종료는 일시 뒤", async ({ request }) => {
    const host = await signIn(request, "C");

    // 확정은 참여 확정이 최소 인원(2명) 이상일 때 (MS15 결정 H4)
    const future = await fixture({ host: "C", accepted: ["P1", "P2"] });
    const confirmed = await rpc(request, "confirm_socialing", { p_socialing_id: future }, host);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body).toMatchObject({ id: future, status: "confirmed" });
    expect((await socialingStateOf(future)).confirmed_at).not.toBeNull();
    // 확정했어도 일시 전이면 종료할 수 없다
    expect((await rpc(request, "complete_socialing", { p_socialing_id: future }, host)).body.message).toBe(
      "NOT_STARTED",
    );
    // 이미 확정한 소셜링을 다시 확정할 수 없다
    expect((await rpc(request, "confirm_socialing", { p_socialing_id: future }, host)).body.message).toBe(
      "INVALID_STATE",
    );

    const past = await fixture({ host: "C", status: "confirmed", accepted: ["P1"], ...STARTED });
    const completed = await rpc(request, "complete_socialing", { p_socialing_id: past }, host);
    expect(completed.status).toBe(200);
    expect(completed.body).toMatchObject({ id: past, status: "completed" });
    expect((await socialingStateOf(past)).completed_at).not.toBeNull();
    // 종료 뒤에는 호스트 취소도 다시 종료도 안 된다
    expect((await rpc(request, "cancel_socialing", { p_socialing_id: past }, host)).body.message).toBe("INVALID_STATE");
    expect((await rpc(request, "complete_socialing", { p_socialing_id: past }, host)).body.message).toBe(
      "INVALID_STATE",
    );
    // 참여 확정자의 신청은 그대로
    expect((await applicationsOf(past)).map((a) => a.status)).toEqual(["accepted"]);
  });

  // MS15에서 규칙이 바뀜(04 2.4·3.6): 확정하지 않은 채 일시가 지난 모집중은 확정 기한도 지나 계산으로 취소·호스트 취소가 되고,
  // 호스트 취소도 막힌다(호스트 취소 수가 두 번 늘지 않게). 예전에는 호스트 취소만 됐다
  test("모집중에서 바로 종료할 수 없고, 확정하지 않은 채 일시가 지나면 확정·호스트 취소도 막힌다 (MS15 계산 취소)", async ({
    request,
  }) => {
    const host = await signIn(request, "C");
    const [expired, gathered] = await Promise.all([
      fixture({ host: "C", ...STARTED }),
      fixture({ host: "C", ...STARTED, accepted: ["P1", "P2"] }),
    ]);

    for (const id of [expired, gathered]) {
      expect((await rpc(request, "complete_socialing", { p_socialing_id: id }, host)).body.message).toBe("INVALID_STATE");
      expect((await rpc(request, "confirm_socialing", { p_socialing_id: id }, host)).body.message).toBe("AUTO_CANCELED");
      expect((await rpc(request, "cancel_socialing", { p_socialing_id: id }, host)).body.message).toBe("AUTO_CANCELED");
      expect((await socialingStateOf(id)).status).toBe("recruiting");
    }
  });

  test("호스트 취소: 모집중·확정 모두 되고, 신청 상태는 바꾸지 않는다 (spec 3.3)", async ({ request }) => {
    const host = await signIn(request, "C");
    const recruiting = await fixture({ host: "C", joinType: "approval", accepted: ["P1"] });
    await addApplication(recruiting, "P2", "pending");
    const confirmed = await fixture({ host: "C", status: "confirmed", accepted: ["P3"] });

    for (const id of [recruiting, confirmed]) {
      const result = await rpc(request, "cancel_socialing", { p_socialing_id: id }, host);
      expect(result.status).toBe(200);
      expect(result.body.status).toBe("canceled");
      expect((await socialingStateOf(id)).canceled_at).not.toBeNull();
    }
    expect((await applicationsOf(recruiting)).map((a) => a.status)).toEqual(["accepted", "pending"]);
    expect((await applicationsOf(confirmed)).map((a) => a.status)).toEqual(["accepted"]);

    // 이미 호스트 취소한 소셜링은 확정·종료·다시 취소가 안 된다
    for (const fn of ["confirm_socialing", "complete_socialing", "cancel_socialing"]) {
      expect((await rpc(request, fn, { p_socialing_id: recruiting }, host)).body.message, fn).toBe("INVALID_STATE");
    }
  });

  test("완료 기준: 호스트가 아니면 확정·종료·호스트 취소를 거부한다 (참여자, 다른 호스트, 비로그인)", async ({
    request,
  }) => {
    const [p1, other] = await Promise.all([signIn(request, "P1"), signIn(request, "D")]);
    const future = await fixture({ host: "C", accepted: ["P1"] });
    const past = await fixture({ host: "C", status: "confirmed", accepted: ["P1"], ...STARTED });
    const cases = [
      ["confirm_socialing", future],
      ["cancel_socialing", future],
      ["complete_socialing", past],
    ] as const;

    for (const [fn, id] of cases) {
      for (const token of [p1, other]) {
        expect((await rpc(request, fn, { p_socialing_id: id }, token)).body.message, fn).toBe("NOT_HOST");
      }
      expect((await rpc(request, fn, { p_socialing_id: id })).status, `${fn} 비로그인`).not.toBe(200);
    }
    expect((await socialingStateOf(future)).status).toBe("recruiting");
    expect((await socialingStateOf(past)).status).toBe("confirmed");

    const host = await signIn(request, "C");
    for (const fn of ["confirm_socialing", "complete_socialing", "cancel_socialing"]) {
      expect((await rpc(request, fn, { p_socialing_id: -1 }, host)).body.message, fn).toBe("INVALID_INPUT");
    }
  });
});

type ManageRow = {
  pending_count: number;
  closed_count: number;
  accepted_count: number;
  can_confirm: boolean;
  confirm_blocked_reason: string | null;
  can_complete: boolean;
  complete_blocked_reason: string | null;
  can_cancel: boolean;
  can_edit: boolean;
  can_decide: boolean;
  can_approve: boolean;
  approve_blocked_reason: string | null;
};

const MANAGE_COLUMNS =
  "pending_count,closed_count,accepted_count,can_confirm,confirm_blocked_reason,can_complete,complete_blocked_reason,can_cancel,can_edit,can_decide,can_approve,approve_blocked_reason";

test.describe("MS4 관리 화면 읽기", () => {
  test("P11-01~06: 상태와 일시에 따라 버튼 가능 여부와 막힌 이유를 DB가 계산한다", async ({ request }) => {
    const host = await signIn(request, "C");
    const cases = [
      // [이름, 테스트 소셜링, 기대값]
      [
        "P11-01 모집중 · 일시 전",
        { status: "recruiting", accepted: ["P1", "P2"] },
        { can_confirm: true, confirm_blocked_reason: null, can_complete: false, complete_blocked_reason: "confirm_first" },
      ],
      [
        "P11-02 확정 · 일시 전",
        { status: "confirmed" },
        { can_confirm: false, confirm_blocked_reason: null, can_complete: false, complete_blocked_reason: "not_started" },
      ],
      [
        "P11-03 확정 · 일시 지남",
        { status: "confirmed", ...STARTED },
        { can_confirm: false, confirm_blocked_reason: null, can_complete: true, complete_blocked_reason: null },
      ],
      // MS15: 확정하지 않은 채 일시가 지난 모집중은 계산으로 취소 → 버튼이 모두 막힌다 (예전에는 호스트 취소만 됨)
      [
        "P11-04 모집중 · 일시 지남",
        { status: "recruiting", ...STARTED },
        {
          can_confirm: false,
          confirm_blocked_reason: "canceled",
          can_complete: false,
          complete_blocked_reason: "not_confirmed",
          can_cancel: false,
          can_edit: false,
        },
      ],
      [
        "P11-05 종료",
        { status: "completed", ...STARTED },
        { can_confirm: false, can_complete: false, complete_blocked_reason: null, can_cancel: false, can_edit: false },
      ],
      [
        "P11-06 호스트 취소",
        { status: "canceled" },
        { can_confirm: false, can_complete: false, complete_blocked_reason: null, can_cancel: false, can_edit: false },
      ],
    ] as const;

    for (const [name, options, expected] of cases) {
      const { accepted, ...rest } = options as typeof options & { accepted?: readonly DemoUserKey[] };
      const id = await fixture({ host: "C", ...rest, accepted: accepted ? [...accepted] : undefined });
      const { rows } = await readAs<ManageRow>(request, `my_hosted_socialings?select=${MANAGE_COLUMNS}&id=eq.${id}`, host);
      expect(rows[0], name).toMatchObject(expected);
    }
  });

  test("P11-12·13: 승인 가능 여부와 이유 (정원 참, 일시 지남)", async ({ request }) => {
    const host = await signIn(request, "C");
    const read = async (id: number) =>
      (await readAs<ManageRow>(request, `my_hosted_socialings?select=${MANAGE_COLUMNS}&id=eq.${id}`, host)).rows[0];

    const open = await fixture({ host: "C", joinType: "approval", capacity: 3, accepted: ["P5"] });
    expect(await read(open)).toMatchObject({ can_decide: true, can_approve: true, approve_blocked_reason: null });

    const full = await fixture({ host: "C", joinType: "approval", capacity: 2, accepted: ["P4", "P5"] });
    expect(await read(full)).toMatchObject({ can_decide: true, can_approve: false, approve_blocked_reason: "full" });

    const started = await fixture({ host: "C", joinType: "approval", status: "confirmed", ...STARTED });
    expect(await read(started)).toMatchObject({ can_decide: false, can_approve: false, approve_blocked_reason: "started" });

    const canceled = await fixture({ host: "C", joinType: "approval", status: "canceled" });
    expect(await read(canceled)).toMatchObject({ can_decide: false, can_approve: false, approve_blocked_reason: null });
  });

  test("신청자 목록: 사람마다 가장 최근 신청 하나와 닉네임, 탭 건수가 목록과 같다", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ host: "C", joinType: "approval", capacity: 6, accepted: ["P1"] });
    await addApplication(id, "P2", "pending");
    await addApplication(id, "P3", "rejected");
    // P4: 거절된 뒤 다시 신청해 승인 대기 → 거절·취소 탭이 아니라 승인 대기 탭에
    await addApplication(id, "P4", "rejected");
    const p4Again = await addApplication(id, "P4", "pending");
    await addApplication(id, "P5", "canceled");

    const { status, rows } = await readAs<{ application_id: number; nickname: string; status: string }>(
      request,
      `hosted_socialing_applicants?select=application_id,nickname,status&socialing_id=eq.${id}`,
      host,
    );
    expect(status).toBe(200);
    const byNickname = (a: string[], b: string[]) => a[0].localeCompare(b[0]);
    expect(rows.map((r) => [r.nickname, r.status]).sort(byNickname)).toEqual(
      [
        ["민지", "accepted"],
        ["태윤", "pending"],
        ["소라", "rejected"],
        ["지훈", "pending"],
        ["예린", "canceled"],
      ].sort(byNickname),
    );
    expect(rows.find((r) => r.nickname === "지훈")?.application_id).toBe(p4Again);

    const counts = (await readAs<ManageRow>(request, `my_hosted_socialings?select=${MANAGE_COLUMNS}&id=eq.${id}`, host))
      .rows[0];
    expect(counts).toMatchObject({ pending_count: 2, accepted_count: 1, closed_count: 2 });
  });

  test("완료 기준: 호스트가 아닌 사람에게는 관리 칸과 신청자 목록이 보이지 않는다", async ({ request }) => {
    const [p1, other] = await Promise.all([signIn(request, "P1"), signIn(request, "D")]);
    const id = await fixture({ host: "C", joinType: "approval", accepted: ["P1"] });
    await addApplication(id, "P2", "pending");

    for (const token of [p1, other]) {
      expect((await readAs(request, `hosted_socialing_applicants?socialing_id=eq.${id}`, token)).rows).toHaveLength(0);
      expect((await readAs(request, `my_hosted_socialings?select=id&id=eq.${id}`, token)).rows).toHaveLength(0);
    }
    // 비로그인은 뷰를 읽을 수 없다
    expect((await readAs(request, `hosted_socialing_applicants?socialing_id=eq.${id}`)).status).not.toBe(200);
  });
});
