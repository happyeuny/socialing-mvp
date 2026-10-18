import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS, type DemoUserKey } from "../../scripts/seed-data.mts";
import { submitLogin } from "./helpers/auth";
import {
  addApplication,
  applicationsOf,
  createFixtureSocialing,
  deleteFixtureSocialings,
  rpc,
  signIn,
  socialingStateOf,
  type FixtureOptions,
} from "./helpers/supabase";

// MS4 소셜링 관리 P11 상태 버튼: 확정 · 종료 · 호스트 취소 · 수정
// (spec 7장 5·7단계, M8, 8.8, screen-cases P11-01~06·14·15·18~20). 시드 데이터는 건드리지 않고 테스트 전용 소셜링을 쓴다.
// MS15: 확정은 참여 확정이 최소 인원(테스트 소셜링 기본 2명) 이상일 때라 확정하는 소셜링에는 참여 확정 2명을 미리 둔다(04 8.3).

/** 확정할 수 있는 모집중 소셜링의 참여 확정자 (최소 인원 2명) */
const MIN_MET: DemoUserKey[] = ["P1", "P2"];

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

const manage = (id: number) => `/socialings/${id}/manage`;
const status = (page: Page) => page.getByRole("region", { name: "소셜링 상태" });
const summary = (page: Page) => page.getByRole("region", { name: "소셜링 요약" });
const currentStep = (page: Page) =>
  page.getByRole("list", { name: "소셜링 진행 단계" }).locator('[aria-current="step"]');
const dialog = (page: Page) => page.getByRole("alertdialog");
const toast = (page: Page) => page.getByTestId("toast");
const button = (page: Page, name: string) => status(page).getByRole("button", { name, exact: true });
const RETRY = "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요";

async function loginAs(page: Page, user: DemoUserKey, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

test.describe("MS4 확정", () => {
  test("시연 5단계(끝)·P11-01·02·18: B가 확정하기 → O04 → 확정, 진행 단계가 바뀌고 종료하기는 일시 전이라 막힘", async ({
    page,
  }) => {
    const id = await fixture({ host: "B", joinType: "approval", accepted: ["A", "P1"] });
    await loginAs(page, "B", manage(id));

    // P11-01 모집중 · 일시 전
    await expect(currentStep(page)).toContainText("모집중");
    await expect(button(page, "확정하기")).toBeEnabled();
    await expect(status(page)).toContainText('확정하면 소셜링 상태가 "확정"으로 바뀌어 모두에게 보여요.');
    await expect(button(page, "종료하기")).toBeDisabled();
    await expect(status(page)).toContainText("확정한 뒤 소셜링 일시가 지나야 종료할 수 있어요");
    await expect(button(page, "호스트 취소")).toBeEnabled();
    await expect(status(page).getByRole("link", { name: "수정" })).toHaveAttribute("href", `/socialings/${id}/edit`);

    await button(page, "확정하기").click();
    await expect(dialog(page).getByRole("heading")).toHaveText("확정할까요?");
    await expect(dialog(page)).toContainText("확정하면 되돌릴 수 없어요.");
    await dialog(page).getByRole("button", { name: "확정하기" }).click();

    await expect(dialog(page)).toHaveCount(0);
    await expect(toast(page)).toHaveText("확정했어요");
    await expect(currentStep(page)).toContainText("확정");
    await expect(summary(page)).toContainText("확정");
    expect((await socialingStateOf(id)).status).toBe("confirmed");

    // P11-02 확정 · 일시 전: 확정하기는 사라지고 종료하기는 막힘
    await expect(button(page, "확정하기")).toHaveCount(0);
    await expect(button(page, "종료하기")).toBeDisabled();
    await expect(status(page)).toContainText("소셜링 일시가 지나야 종료할 수 있어요");
    await expect(button(page, "호스트 취소")).toBeEnabled();
  });

  // MS15에서 규칙이 바뀜(04 3.6): 확정하지 않은 채 일시가 지난 모집중은 계산으로 취소(신청 없음)라 호스트 취소·수정도 막힌다.
  // 버튼 대신 안내로 바꾸는 것은 관리 PR(MS15 PR 4)에서
  test("P11-04: 확정하지 않은 채 일시가 지난 모집중 소셜링은 확정·종료·호스트 취소·수정이 막힌다 (MS15 계산 취소)", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", deadlineInHours: -3, startsInHours: -1 });
    await loginAs(page, "C", manage(id));

    await expect(button(page, "확정하기")).toBeDisabled();
    await expect(status(page)).toContainText("이미 취소된 소셜링이에요");
    await expect(button(page, "종료하기")).toBeDisabled();
    await expect(status(page)).toContainText("확정하지 않은 소셜링은 종료할 수 없어요");
    await expect(button(page, "호스트 취소")).toHaveCount(0);
    await expect(status(page).getByRole("link", { name: "수정" })).toHaveCount(0);
  });

  test("O04 돌아가기는 아무것도 바꾸지 않는다", async ({ page }) => {
    const id = await fixture({ host: "C", accepted: MIN_MET });
    await loginAs(page, "C", manage(id));

    await button(page, "확정하기").click();
    await dialog(page).getByRole("button", { name: "돌아가기" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(currentStep(page)).toContainText("모집중");
    expect((await socialingStateOf(id)).status).toBe("recruiting");
  });

  test("P11-14: 화면을 연 사이 다른 곳에서 호스트 취소했으면 '확정하지 못했어요 · 이미 처리된 소셜링이에요' → 새로 고침", async ({
    page,
    request,
  }) => {
    const id = await fixture({ host: "C", accepted: MIN_MET });
    await loginAs(page, "C", manage(id));
    await expect(button(page, "확정하기")).toBeEnabled();

    expect((await rpc(request, "cancel_socialing", { p_socialing_id: id }, await signIn(request, "C"))).status).toBe(200);
    await button(page, "확정하기").click();
    await dialog(page).getByRole("button", { name: "확정하기" }).click();
    await expect(dialog(page).getByRole("heading")).toHaveText("확정하지 못했어요");
    await expect(dialog(page)).toContainText("이미 처리된 소셜링이에요");
    await dialog(page).getByRole("button", { name: "확인" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(status(page)).toContainText("호스트 취소한 소셜링이에요");
  });

  test("P11-15: 네트워크 오류면 O04를 연 채 안내 + 다시 시도, 다시 누르면 확정된다", async ({ page }) => {
    const id = await fixture({ host: "C", accepted: MIN_MET });
    await loginAs(page, "C", manage(id));

    await page.route(`**${manage(id)}*`, (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
    );
    await button(page, "확정하기").click();
    await dialog(page).getByRole("button", { name: "확정하기" }).click();
    await expect(dialog(page).getByRole("alert")).toHaveText(RETRY);
    expect((await socialingStateOf(id)).status).toBe("recruiting");

    await page.unroute(`**${manage(id)}*`);
    await dialog(page).getByRole("button", { name: "다시 시도" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(toast(page)).toHaveText("확정했어요");
    expect((await socialingStateOf(id)).status).toBe("confirmed");
  });
});

test.describe("MS4 종료", () => {
  test("시연 7단계·P11-03·05·19: 일시가 지난 확정 소셜링을 내 소셜링 → 관리 → 종료, 참여자는 후기를 쓸 수 있다", async ({
    page,
  }) => {
    const id = await fixture({
      host: "B",
      status: "confirmed",
      deadlineInHours: -30,
      startsInHours: -24,
      accepted: ["A"],
    });
    await loginAs(page, "B", "/me?tab=host");
    await page.locator(`article:has(a[href="${manage(id)}"])`).getByRole("link").first().click();
    await expect(page).toHaveURL(manage(id));

    // P11-03 확정 · 일시 지남
    await expect(button(page, "종료하기")).toBeEnabled();
    await button(page, "종료하기").click();
    await expect(dialog(page).getByRole("heading")).toHaveText("종료할까요?");
    await expect(dialog(page)).toContainText("참여 확정자가 인증 후기를 쓸 수 있게 돼요.");
    await dialog(page).getByRole("button", { name: "종료하기" }).click();

    await expect(toast(page)).toHaveText("종료했어요 · 참여자가 이제 후기를 쓸 수 있어요");
    await expect(currentStep(page)).toContainText("종료");
    expect((await socialingStateOf(id)).status).toBe("completed");

    // P11-05 종료 뒤: 상태 버튼 대신 안내, 목록 보기만, 상세 보기는 남음
    await expect(status(page)).toContainText("종료한 소셜링이에요 · 참여자가 후기를 쓸 수 있어요");
    await expect(status(page).getByRole("button")).toHaveCount(0);
    await expect(status(page).getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "상세 보기" })).toBeVisible();

    // 참여 확정자 A의 상세: 후기 쓰기
    await page.context().clearCookies();
    await loginAs(page, "A", `/socialings/${id}`);
    const bar = page.getByRole("region", { name: "신청" });
    await expect(bar).toContainText("소셜링이 끝났어요");
    await expect(bar.getByRole("link", { name: "후기 쓰기" })).toBeVisible();
  });
});

test.describe("MS4 호스트 취소", () => {
  test("P11-06·20: 호스트 취소 → O04(빨간 버튼) → 안내, 신청 상태는 그대로, 승인 대기 건도 보기만, 상세는 호스트 취소", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", joinType: "approval", accepted: ["P1"] });
    await addApplication(id, "P2", "pending");
    await loginAs(page, "C", manage(id));

    await button(page, "호스트 취소").click();
    await expect(dialog(page).getByRole("heading")).toHaveText("호스트 취소할까요?");
    await expect(dialog(page)).toContainText("취소하면 되돌릴 수 없어요.");
    await dialog(page).getByRole("button", { name: "호스트 취소" }).click();

    await expect(toast(page)).toHaveText("호스트 취소했어요");
    await expect(status(page)).toContainText("호스트 취소한 소셜링이에요");
    await expect(currentStep(page)).toHaveCount(0);
    await expect(status(page).getByRole("button")).toHaveCount(0);
    await expect(summary(page)).toContainText("호스트 취소");
    expect((await socialingStateOf(id)).status).toBe("canceled");
    expect(await applicationsOf(id)).toEqual([
      { email: DEMO_USERS.P1.email, status: "accepted" },
      { email: DEMO_USERS.P2.email, status: "pending" },
    ]);

    // 승인 대기 건은 버튼 없이 칩만
    const list = page.getByRole("list", { name: "신청자 목록" });
    await expect(list.getByRole("listitem").filter({ hasText: DEMO_USERS.P2.nickname })).toContainText("승인 대기");
    await expect(list.getByRole("button")).toHaveCount(0);

    // 상세: 호스트 본인에게는 여전히 관리하기(spec 8.4 1줄), 참여 확정자에게는 호스트 취소(2줄)
    await page.getByRole("link", { name: "상세 보기" }).click();
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByRole("region", { name: "신청" }).getByRole("link", { name: /^관리하기/ })).toBeVisible();
    await page.context().clearCookies();
    await loginAs(page, "P1", `/socialings/${id}`);
    await expect(page.getByRole("region", { name: "신청" })).toContainText("호스트가 취소한 소셜링이에요");
  });
});
