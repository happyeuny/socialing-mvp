import { expect, test } from "@playwright/test";
import {
  applicationsOf,
  applyInDbHolding,
  createFixtureSocialing,
  deleteFixtureSocialings,
  rpc,
  signIn,
} from "./helpers/supabase";

// SP2 동시 신청 정원 초과 방지: apply_to_socialing (architecture 5장, spec 3.2·3.3)
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

test.describe("SP2 apply_to_socialing", () => {
  test("정원 1자리에 두 사용자가 동시에 신청하면 하나만 참여 확정된다 (5회 반복)", async ({ request }) => {
    // 회차마다 테스트 소셜링을 Management API로 만들어서 한 회차에 몇 초씩 걸린다
    test.setTimeout(120_000);
    const [p1, p2] = await Promise.all([signIn(request, "P1"), signIn(request, "P2")]);

    for (let round = 1; round <= 5; round += 1) {
      const id = await fixture({ host: "C", capacity: 2, accepted: ["P5"] });

      const results = await Promise.all([
        rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1),
        rpc(request, "apply_to_socialing", { p_socialing_id: id }, p2),
      ]);

      const succeeded = results.filter((r) => r.status === 200);
      const failed = results.filter((r) => r.status !== 200);
      expect(succeeded, `${round}회차: 성공 1개`).toHaveLength(1);
      expect(succeeded[0].body.status).toBe("accepted");
      expect(failed, `${round}회차: 실패 1개`).toHaveLength(1);
      expect(failed[0].body.message).toBe("FULL");

      const accepted = (await applicationsOf(id)).filter((a) => a.status === "accepted");
      expect(accepted, `${round}회차: 참여 확정 = 정원`).toHaveLength(2);
    }
  });

  test("먼저 들어온 신청이 끝나기 전의 두 번째 신청은 기다렸다가 정원 마감으로 거절된다", async () => {
    const id = await fixture({ host: "C", capacity: 2, accepted: ["P5"] });

    // 첫 신청은 잠금을 쥔 채 2초 동안 커밋하지 않는다. 두 번째 신청은 0.5초 뒤에 들어온다.
    const first = applyInDbHolding(id, "P1", 2);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const startedAt = Date.now();
    const second = await applyInDbHolding(id, "P2", 0);
    const waitedMs = Date.now() - startedAt;

    expect(await first).toBe("OK");
    expect(second).toBe("FULL");
    expect(waitedMs, "두 번째 신청은 첫 신청의 잠금을 기다렸다").toBeGreaterThan(1000);
    expect((await applicationsOf(id)).filter((a) => a.status === "accepted")).toHaveLength(2);
  });

  test("선착순은 참여 확정, 호스트 승인은 승인 대기", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const firstCome = await fixture({ host: "C", joinType: "first_come" });
    const approval = await fixture({ host: "C", joinType: "approval" });

    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: firstCome }, p1)).body.status).toBe("accepted");
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: approval }, p1)).body.status).toBe("pending");
  });

  test("신청할 수 없으면 정해진 오류 코드를 돌려준다", async ({ request }) => {
    const [p1, host] = await Promise.all([signIn(request, "P1"), signIn(request, "C")]);

    const open = await fixture({ host: "C" });
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: open }, host)).body.message).toBe("IS_HOST");

    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: open }, p1)).status).toBe(200);
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: open }, p1)).body.message).toBe("ALREADY_APPLIED");

    const deadlinePassed = await fixture({ host: "C", deadlineInHours: -1 });
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: deadlinePassed }, p1)).body.message).toBe(
      "DEADLINE_PASSED",
    );

    const canceled = await fixture({ host: "C", status: "canceled" });
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: canceled }, p1)).body.message).toBe(
      "HOST_CANCELED",
    );

    const completed = await fixture({ host: "C", status: "completed" });
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: completed }, p1)).body.message).toBe("NOT_OPEN");

    const full = await fixture({ host: "C", capacity: 2, accepted: ["P4", "P5"] });
    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: full }, p1)).body.message).toBe("FULL");

    expect((await rpc(request, "apply_to_socialing", { p_socialing_id: -1 }, p1)).body.message).toBe("INVALID_INPUT");
  });

  test("비로그인은 함수를 부를 수 없다", async ({ request }) => {
    const open = await fixture({ host: "C" });
    const result = await rpc(request, "apply_to_socialing", { p_socialing_id: open });
    expect(result.status).not.toBe(200);
    expect(await applicationsOf(open)).toHaveLength(0);
  });
});
