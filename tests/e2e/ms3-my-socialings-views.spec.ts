import { expect, test } from "@playwright/test";
import {
  addApplication,
  addReview,
  createFixtureSocialing,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
} from "./helpers/supabase";

// MS3 "나" 기준 읽기 뷰: my_applied_socialings, my_hosted_socialings (architecture 3.2·4장, spec 8.4·M11)
// 상세 아래 영역과 내 소셜링 두 탭이 읽는다. 테스트 전용 [E2E] 소셜링만 골라 읽고 끝에 지운다.

type Applied = {
  id: number;
  application_id: number;
  application_status: string;
  has_review: boolean;
  status: string;
  accepted_count: number;
};
type Hosted = { id: number; pending_count: number; accepted_count: number };

const APPLIED_COLUMNS = "id,application_id,application_status,has_review,status,accepted_count";

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

test.describe("MS3 my_applied_socialings", () => {
  test("소셜링마다 내 가장 최근 신청 하나와 카드 칸이 보인다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const reapplied = await fixture({ host: "C", joinType: "approval" });
    const first = await rpc(request, "apply_to_socialing", { p_socialing_id: reapplied }, p1);
    await rpc(request, "cancel_application", { p_application_id: first.body.id }, p1);
    const second = await rpc(request, "apply_to_socialing", { p_socialing_id: reapplied }, p1);

    const rejected = await fixture({ host: "C", joinType: "approval" });
    const rejectedId = await addApplication(rejected, "P1", "rejected");

    const { status, rows } = await readAs<Applied>(
      request,
      `my_applied_socialings?select=${APPLIED_COLUMNS}&id=in.(${reapplied},${rejected})&order=id`,
      p1,
    );
    expect(status).toBe(200);
    expect(rows).toEqual([
      {
        id: reapplied,
        application_id: second.body.id,
        application_status: "pending",
        has_review: false,
        status: "recruiting",
        accepted_count: 0,
      },
      {
        id: rejected,
        application_id: rejectedId,
        application_status: "rejected",
        has_review: false,
        status: "recruiting",
        accepted_count: 0,
      },
    ]);
  });

  test("후기를 썼는지(has_review)와, 호스트 취소돼도 신청 상태는 그대로인지", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const completed = await fixture({
      host: "C",
      status: "completed",
      deadlineInHours: -30,
      startsInHours: -24,
      accepted: ["P1"],
    });
    await addReview(completed, "P1");
    const canceled = await fixture({ host: "C", status: "canceled", accepted: ["P1"] });

    const { rows } = await readAs<Applied>(
      request,
      `my_applied_socialings?select=id,application_status,has_review,status&id=in.(${completed},${canceled})&order=id`,
      p1,
    );
    expect(rows).toEqual([
      { id: completed, application_status: "accepted", has_review: true, status: "completed" },
      { id: canceled, application_status: "accepted", has_review: false, status: "canceled" },
    ]);
  });

  test("다른 사람의 신청은 보이지 않는다 (호스트라도 이 뷰에서는 자기 신청만)", async ({ request }) => {
    const [p2, host] = await Promise.all([signIn(request, "P2"), signIn(request, "C")]);
    const id = await fixture({ host: "C", accepted: ["P1"] });

    for (const [name, token] of [
      ["다른 참여자", p2],
      ["호스트", host],
    ] as const) {
      const { status, rows } = await readAs<Applied>(request, `my_applied_socialings?select=id&id=eq.${id}`, token);
      expect(status, name).toBe(200);
      expect(rows, name).toHaveLength(0);
    }
  });

  test("비로그인은 읽을 수 없다", async ({ request }) => {
    const { status } = await readAs(request, "my_applied_socialings?select=id&limit=1");
    expect(status).not.toBe(200);
  });
});

test.describe("MS3 my_hosted_socialings", () => {
  test("호스트는 자기 소셜링과 승인 대기 건수를 본다", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ host: "C", joinType: "approval", capacity: 5, accepted: ["P3"] });
    await addApplication(id, "P1", "pending");
    await addApplication(id, "P2", "pending");
    await addApplication(id, "P4", "rejected");
    const none = await fixture({ host: "C" });

    const { status, rows } = await readAs<Hosted>(
      request,
      `my_hosted_socialings?select=id,pending_count,accepted_count&id=in.(${id},${none})&order=id`,
      host,
    );
    expect(status).toBe(200);
    expect(rows).toEqual([
      { id, pending_count: 2, accepted_count: 1 },
      { id: none, pending_count: 0, accepted_count: 0 },
    ]);
  });

  test("호스트가 아니면 그 소셜링도, 승인 대기 건수도 보이지 않는다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P2", "pending");

    const { status, rows } = await readAs<Hosted>(request, `my_hosted_socialings?select=id&id=eq.${id}`, p1);
    expect(status).toBe(200);
    expect(rows).toHaveLength(0);
    expect((await readAs(request, "my_hosted_socialings?select=id&limit=1")).status).not.toBe(200);
  });
});
