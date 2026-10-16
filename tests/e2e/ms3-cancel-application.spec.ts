import { expect, test } from "@playwright/test";
import {
  addApplication,
  applicationsOf,
  createFixtureSocialing,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
} from "./helpers/supabase";

// MS3 cancel_application: 신청 취소 (architecture 5장, spec 3.3·M7, screen-cases O05)
// 시드 데이터는 건드리지 않고, 테스트 전용 소셜링을 만들고 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

test.describe("MS3 cancel_application", () => {
  test("승인 대기 신청을 취소하면 신청 취소가 되고, 다시 신청하면 새 신청 행이 생긴다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ host: "C", joinType: "approval" });

    const applied = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1);
    expect(applied.body.status).toBe("pending");

    const canceled = await rpc(request, "cancel_application", { p_application_id: applied.body.id }, p1);
    expect(canceled.status).toBe(200);
    expect(canceled.body.status).toBe("canceled");

    const reapplied = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1);
    expect(reapplied.body.status).toBe("pending");
    expect(reapplied.body.id).not.toBe(applied.body.id);
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["canceled", "pending"]);
  });

  test("참여 확정을 취소하면 자리가 다시 생긴다 (정원 마감 → 신청 가능)", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ host: "C", capacity: 2, accepted: ["P5"] });

    const applied = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1);
    expect(applied.body.status).toBe("accepted");
    const full = await readAs<{ can_apply: boolean; accepted_count: number }>(
      request,
      `socialing_summaries?select=can_apply,accepted_count&id=eq.${id}`,
    );
    expect(full.rows[0]).toEqual({ can_apply: false, accepted_count: 2 });

    expect((await rpc(request, "cancel_application", { p_application_id: applied.body.id }, p1)).status).toBe(200);
    const reopened = await readAs<{ can_apply: boolean; accepted_count: number }>(
      request,
      `socialing_summaries?select=can_apply,accepted_count&id=eq.${id}`,
    );
    expect(reopened.rows[0]).toEqual({ can_apply: true, accepted_count: 1 });
  });

  test("취소할 수 없으면 정해진 오류 코드를 돌려준다", async ({ request }) => {
    // 소셜링·신청은 Management API로 만들어 한 번에 하나씩이면 30초 제한에 닿는다 → 미리 한꺼번에 만든다
    const [p1, p2, host, open, rejectedIn, withdrawnIn, canceledIn, started] = await Promise.all([
      signIn(request, "P1"),
      signIn(request, "P2"),
      signIn(request, "C"),
      fixture({ host: "C" }),
      fixture({ host: "C" }),
      fixture({ host: "C" }),
      fixture({ host: "C", status: "canceled" }),
      fixture({ host: "C", status: "confirmed", deadlineInHours: -3, startsInHours: -1 }),
    ]);
    const [mine, rejected, withdrawn, hostCanceled, startedApplications] = await Promise.all([
      addApplication(open, "P1", "accepted"),
      addApplication(rejectedIn, "P1", "rejected"),
      addApplication(withdrawnIn, "P1", "canceled"),
      addApplication(canceledIn, "P1", "accepted"),
      // 신청 순서를 지키려고 이 둘만 차례로
      addApplication(started, "P1", "pending").then(async (pending) => ({
        pending,
        accepted: await addApplication(started, "P2", "accepted"),
      })),
    ]);

    // 남의 신청과 없는 신청은 같게 답한다 (호스트도 참여자의 신청을 취소할 수 없다)
    expect((await rpc(request, "cancel_application", { p_application_id: mine }, p2)).body.message).toBe(
      "INVALID_INPUT",
    );
    expect((await rpc(request, "cancel_application", { p_application_id: mine }, host)).body.message).toBe(
      "INVALID_INPUT",
    );
    expect((await rpc(request, "cancel_application", { p_application_id: -1 }, p1)).body.message).toBe(
      "INVALID_INPUT",
    );

    // 이미 거절됐거나 취소한 신청
    expect((await rpc(request, "cancel_application", { p_application_id: rejected }, p1)).body.message).toBe(
      "ALREADY_PROCESSED",
    );
    expect((await rpc(request, "cancel_application", { p_application_id: withdrawn }, p1)).body.message).toBe(
      "ALREADY_PROCESSED",
    );

    // 호스트 취소된 소셜링: 호스트 취소 기록이 줄지 않게 막는다
    expect((await rpc(request, "cancel_application", { p_application_id: hostCanceled }, p1)).body.message).toBe(
      "HOST_CANCELED",
    );

    // 소셜링 일시가 지남 (승인 대기·참여 확정 모두)
    for (const status of ["pending", "accepted"] as const) {
      const token = status === "pending" ? p1 : p2;
      expect(
        (await rpc(request, "cancel_application", { p_application_id: startedApplications[status] }, token)).body
          .message,
        status,
      ).toBe("STARTED");
    }

    // 실패한 호출은 아무것도 바꾸지 않는다
    expect((await applicationsOf(started)).map((a) => a.status)).toEqual(["pending", "accepted"]);
  });

  test("비로그인은 함수를 부를 수 없다", async ({ request }) => {
    const open = await fixture({ host: "C" });
    const application = await addApplication(open, "P1", "accepted");
    const result = await rpc(request, "cancel_application", { p_application_id: application });
    expect(result.status).not.toBe(200);
    expect((await applicationsOf(open)).map((a) => a.status)).toEqual(["accepted"]);
  });
});
