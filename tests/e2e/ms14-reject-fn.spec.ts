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

// MS14 reject_application: 거절 사유를 고르는 거절 (U10, architecture 5장, spec 8.8 O04)
// 검사는 decide_application 거절(MS4)과 같고 사유를 더한다. 사유는 신청자 본인(my_applied_socialings)과
// 그 소셜링의 호스트(hosted_socialing_applicants)만 본다.
// 시드 데이터는 건드리지 않고, 호스트 C의 테스트 전용 소셜링을 만들고 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

type RejectReason = "criteria" | "age" | "full" | "host" | "other";
const reject = (applicationId: number, reason: RejectReason | null, note: string | null, token?: string) =>
  ({ args: { p_application_id: applicationId, p_reason: reason, p_note: note }, token });

test.describe("MS14 reject_application", () => {
  test("O04 거절: 사유와 덧붙인 말(앞뒤 공백 뺌)을 남기고 바뀐 신청 행을 돌려준다", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ host: "C", joinType: "approval", approvalCriteria: "사진을 많이 찍어 볼 분" });
    const [p1, p2] = await Promise.all([addApplication(id, "P1", "pending"), addApplication(id, "P2", "pending")]);

    const withNote = reject(p1, "criteria", "  이번에는 사진을 많이 찍어 볼 분들로 모셨어요.  ", host);
    const result = await rpc(request, "reject_application", withNote.args, withNote.token);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: p1,
      status: "rejected",
      reject_reason: "criteria",
      reject_note: "이번에는 사진을 많이 찍어 볼 분들로 모셨어요.",
    });

    // 덧붙인 말은 선택, 빈칸이면 null
    const blank = await rpc(request, "reject_application", reject(p2, "full", "   ").args, host);
    expect(blank.body).toMatchObject({ id: p2, status: "rejected", reject_reason: "full", reject_note: null });
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["rejected", "rejected"]);
  });

  test("사유: 꼭 고르고, 연령 조건은 조건이 있을 때만, 그 밖의 이유는 글이 필요하고 글은 100자까지 (INVALID_INPUT)", async ({
    request,
  }) => {
    const host = await signIn(request, "C");
    const [plain, aged] = await Promise.all([
      fixture({ host: "C", joinType: "approval", approvalCriteria: "누구나" }),
      fixture({ host: "C", joinType: "approval", approvalCriteria: "누구나", minAge: 20, maxAge: 39 }),
    ]);
    const [a1, a2] = await Promise.all([addApplication(plain, "P1", "pending"), addApplication(aged, "P1", "pending")]);

    for (const [name, args] of [
      ["사유 없음", reject(a1, null, null).args],
      ["연령 조건이 없는데 연령", reject(a1, "age", null).args],
      ["그 밖의 이유 + 글 없음", reject(a1, "other", "  ").args],
      ["글 101자", reject(a1, "host", "가".repeat(101)).args],
    ] as const) {
      const result = await rpc(request, "reject_application", args, host);
      expect(result.body.message, name).toBe("INVALID_INPUT");
    }
    // 아무것도 바뀌지 않았다
    expect((await applicationsOf(plain)).map((a) => a.status)).toEqual(["pending"]);

    const [other, age] = await Promise.all([
      rpc(request, "reject_application", reject(a1, "other", "가".repeat(100)).args, host),
      rpc(request, "reject_application", reject(a2, "age", null).args, host),
    ]);
    expect(other.body).toMatchObject({ status: "rejected", reject_reason: "other", reject_note: "가".repeat(100) });
    expect(age.body).toMatchObject({ status: "rejected", reject_reason: "age" });
  });

  test("decide_application 거절과 같은 검사: 호스트 아님·이미 처리·일시 지남·종료·없는 신청·비로그인", async ({
    request,
  }) => {
    const [host, p1, otherHost] = await Promise.all([signIn(request, "C"), signIn(request, "P1"), signIn(request, "D")]);
    const [open, started, completed] = await Promise.all([
      fixture({ host: "C", joinType: "approval" }),
      fixture({ host: "C", joinType: "approval", deadlineInHours: -3, startsInHours: -1 }),
      fixture({ host: "C", joinType: "approval", status: "completed", deadlineInHours: -3, startsInHours: -1 }),
    ]);
    const [pending, accepted, startedPending, completedPending] = await Promise.all([
      addApplication(open, "P1", "pending"),
      addApplication(open, "P2", "accepted"),
      addApplication(started, "P1", "pending"),
      addApplication(completed, "P1", "pending"),
    ]);

    const code = async (applicationId: number, token?: string) =>
      (await rpc(request, "reject_application", reject(applicationId, "host", null).args, token)).body.message;
    expect(await code(pending, p1)).toBe("NOT_HOST");
    expect(await code(pending, otherHost)).toBe("NOT_HOST");
    expect(await code(accepted, host)).toBe("ALREADY_PROCESSED");
    expect(await code(startedPending, host)).toBe("STARTED");
    expect(await code(completedPending, host)).toBe("INVALID_STATE");
    expect(await code(999999999, host)).toBe("INVALID_INPUT");
    expect((await rpc(request, "reject_application", reject(pending, "host", null).args)).status).not.toBe(200);
    expect((await applicationsOf(open)).map((a) => a.status)).toEqual(["pending", "accepted"]);
  });

  test("U10 읽기: 거절 사유는 신청자 본인과 호스트만 보고, 다시 신청하면 가장 최근 신청(사유 없음)이 보인다", async ({
    request,
  }) => {
    const [host, p1, p2] = await Promise.all([signIn(request, "C"), signIn(request, "P1"), signIn(request, "P2")]);
    const id = await fixture({ host: "C", joinType: "approval", approvalCriteria: "누구나" });
    const first = await addApplication(id, "P1", "pending");
    await rpc(request, "reject_application", reject(first, "criteria", "다음에 함께해요").args, host);

    type Applied = { application_status: string; reject_reason: string | null; reject_note: string | null };
    const appliedPath = `my_applied_socialings?select=application_status,reject_reason,reject_note&id=eq.${id}`;
    expect((await readAs<Applied>(request, appliedPath, p1)).rows).toEqual([
      { application_status: "rejected", reject_reason: "criteria", reject_note: "다음에 함께해요" },
    ]);
    type Applicant = { status: string; reject_reason: string | null; reject_note: string | null };
    const applicantsPath = `hosted_socialing_applicants?select=status,reject_reason,reject_note&socialing_id=eq.${id}`;
    expect((await readAs<Applicant>(request, applicantsPath, host)).rows).toEqual([
      { status: "rejected", reject_reason: "criteria", reject_note: "다음에 함께해요" },
    ]);
    // 다른 사람에게는 그 신청 행이 보이지 않는다
    expect((await readAs(request, `applications?select=reject_reason&socialing_id=eq.${id}`, p2)).rows).toEqual([]);
    expect((await readAs(request, applicantsPath, p2)).rows).toEqual([]);

    // 다시 신청하면 새 신청 행이 가장 최근이라 이전 사유는 보이지 않는다 (03 7.5)
    const again = await rpc(request, "apply_to_socialing", { p_socialing_id: id }, p1);
    expect(again.body.status).toBe("pending");
    expect((await readAs<Applied>(request, appliedPath, p1)).rows).toEqual([
      { application_status: "pending", reject_reason: null, reject_note: null },
    ]);
    expect((await readAs<Applicant>(request, applicantsPath, host)).rows).toEqual([
      { status: "pending", reject_reason: null, reject_note: null },
    ]);
  });

  test("옛 거절 길 decide_application(…, false)은 main 코드가 쓰므로 그대로 동작한다 (사유 없음)", async ({ request }) => {
    const host = await signIn(request, "C");
    const id = await fixture({ host: "C", joinType: "approval" });
    const application = await addApplication(id, "P1", "pending");
    const result = await rpc(request, "decide_application", { p_application_id: application, p_approve: false }, host);
    expect(result.body).toMatchObject({ status: "rejected", reject_reason: null, reject_note: null });
  });
});
