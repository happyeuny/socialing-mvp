import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS, type DemoUserKey } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  applicationsOf,
  createFixtureSocialing,
  deleteFixtureSocialings,
  rpc,
  signIn,
  type FixtureOptions,
} from "./helpers/supabase";

// MS4 소셜링 관리 P11 승인·거절 (spec 7장 5단계, M8, 8.8, screen-cases P11-07·12~17, C13)
// 시드 데이터는 건드리지 않고 테스트 전용 소셜링을 쓴다.

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
const summary = (page: Page) => page.getByRole("region", { name: "소셜링 요약" });
const tabs = (page: Page) => page.getByRole("navigation", { name: "신청자 보기" });
const list = (page: Page) => page.getByRole("list", { name: "신청자 목록" });
const row = (page: Page, user: DemoUserKey) =>
  list(page).getByRole("listitem").filter({ hasText: DEMO_USERS[user].nickname });
const dialog = (page: Page) => page.getByRole("alertdialog");
const toast = (page: Page) => page.getByTestId("toast");
const RETRY = "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요";

async function loginAs(page: Page, user: DemoUserKey, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

/** 서버 액션 요청만 끊는다 */
async function abortActions(page: Page, id: number) {
  await page.route(`**${manage(id)}*`, (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
  );
}

test.describe("MS4 승인", () => {
  test("시연 5단계(앞)·P11-07·16: B가 내 소셜링 → 관리에서 A를 승인하면 참여 확정, 탭·요약·남은 자리가 바로 바뀐다", async ({
    page,
  }) => {
    const id = await fixture({ host: "B", joinType: "approval", capacity: 4 });
    await addApplication(id, "A", "pending");
    await addApplication(id, "P1", "pending");
    await loginAs(page, "B", "/me?tab=host");
    await page.locator(`article:has(a[href="${manage(id)}"])`).getByRole("link").first().click();
    await expect(page).toHaveURL(manage(id));

    await expect(tabs(page).getByRole("link")).toHaveText(["승인 대기 2", "참여 확정 0", "거절·취소 0"]);
    await expect(page.getByText("남은 자리 4 · 정원이 차면 승인할 수 없어요")).toBeVisible();
    await row(page, "A").getByRole("button", { name: "승인" }).click();

    await expect(toast(page)).toHaveText("승인했어요");
    await expect(tabs(page).getByRole("link")).toHaveText(["승인 대기 1", "참여 확정 1", "거절·취소 0"]);
    await expect(summary(page)).toContainText("참가자 1/4명");
    await expect(summary(page)).toContainText("승인 대기 1");
    await expect(row(page, "A")).toHaveCount(0);
    await expect(page.getByText("남은 자리 3 · 정원이 차면 승인할 수 없어요")).toBeVisible();
    expect(await applicationsOf(id)).toEqual([
      { email: DEMO_USERS.A.email, status: "accepted" },
      { email: DEMO_USERS.P1.email, status: "pending" },
    ]);

    await tabs(page).getByRole("link", { name: "참여 확정 1" }).click();
    await expect(row(page, "A")).toContainText("참여 확정");

    // 버튼이 있는 줄도 320px에서 가로 스크롤이 생기지 않는다
    await tabs(page).getByRole("link", { name: "승인 대기 1" }).click();
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });

  test("P11-12: 정원이 차면 승인이 막히고 이유가 보인다. 거절은 된다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval", capacity: 2, accepted: ["P1", "P2"] });
    await addApplication(id, "P3", "pending");
    await loginAs(page, "C", manage(id));

    await expect(row(page, "P3").getByRole("button", { name: "승인" })).toBeDisabled();
    await expect(row(page, "P3").getByRole("button", { name: "거절" })).toBeEnabled();
    await expect(page.getByText("정원이 차서 승인할 수 없어요")).toBeVisible();
    await expect(page.getByText(/남은 자리/)).toHaveCount(0);
  });

  // MS15: 일시가 지난 모집중은 계산으로 취소라 버튼 없이 보기만(아래 테스트). 일시 지남 이유는 확정 소셜링에서 본다
  test("P11-13: 소셜링 일시가 지나면 승인·거절이 막히고 이유가 보인다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval", status: "confirmed", deadlineInHours: -3, startsInHours: -1 });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await expect(row(page, "P1").getByRole("button", { name: "승인" })).toBeDisabled();
    await expect(row(page, "P1").getByRole("button", { name: "거절" })).toBeDisabled();
    await expect(page.getByText("소셜링 일시가 지나 승인할 수 없어요")).toBeVisible();
  });

  test("MS15 계산으로 취소된 모집중(확정 기한 지남)의 승인 대기 건도 버튼 없이 '승인 대기' 칩만 (목록 보기만)", async ({ page }) => {
    // 참여 확정 2 + 승인 대기 1, 확정하지 않은 채 확정 기한이 지남 → 호스트 취소(계산)
    const id = await fixture({ host: "C", joinType: "approval", deadlineInHours: -3, accepted: ["P2", "P3"] });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await expect(row(page, "P1")).toContainText("승인 대기");
    await expect(row(page, "P1").getByRole("button")).toHaveCount(0);
    await expect(page.getByText(/남은 자리|승인할 수 없어요/)).toHaveCount(0);
  });

  test("종료·호스트 취소 뒤 승인 대기 건은 버튼 없이 '승인 대기' 칩만 (목록 보기만)", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval", status: "canceled" });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await expect(row(page, "P1")).toContainText("승인 대기");
    await expect(row(page, "P1").getByRole("button")).toHaveCount(0);
    await expect(page.getByText(/남은 자리|승인할 수 없어요/)).toHaveCount(0);
  });

  test("P11-14: 그 사이 신청이 취소됐거나 정원이 찼으면 결과 창에 이유 → 확인 → 목록 새로 고침", async ({
    page,
    request,
  }) => {
    // 정원 2에 이미 한 명, 남은 자리 하나
    const id = await fixture({ host: "C", joinType: "approval", capacity: 2, accepted: ["P4"] });
    const p1 = await addApplication(id, "P1", "pending");
    const p2 = await addApplication(id, "P2", "pending");
    await addApplication(id, "P3", "pending");
    await loginAs(page, "C", manage(id));
    await expect(list(page).getByRole("listitem")).toHaveCount(3);

    // 화면을 연 사이 P1이 신청을 취소한다
    expect((await rpc(request, "cancel_application", { p_application_id: p1 }, await signIn(request, "P1"))).status).toBe(200);
    await row(page, "P1").getByRole("button", { name: "승인" }).click();
    await expect(dialog(page)).toContainText("승인하지 못했어요");
    await expect(dialog(page)).toContainText("이미 처리된 신청이에요");
    await dialog(page).getByRole("button", { name: "확인" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(row(page, "P1")).toHaveCount(0);
    await expect(tabs(page).getByRole("link", { name: "거절·취소 1" })).toBeVisible();

    // 다른 화면에서 P2를 승인해 정원이 찬다
    const token = await signIn(request, "C");
    expect((await rpc(request, "decide_application", { p_application_id: p2, p_approve: true }, token)).status).toBe(200);
    await row(page, "P3").getByRole("button", { name: "승인" }).click();
    await expect(dialog(page)).toContainText("정원이 차서 승인할 수 없어요");
    await dialog(page).getByRole("button", { name: "확인" }).click();
    await expect(row(page, "P3").getByRole("button", { name: "승인" })).toBeDisabled();
    await expect(page.getByText("정원이 차서 승인할 수 없어요")).toBeVisible();
    await expect(summary(page)).toContainText("참가자 2/2명");
  });

  test("P11-15: 네트워크 오류면 승인은 짧은 안내, 그대로 승인 대기", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await abortActions(page, id);
    await row(page, "P1").getByRole("button", { name: "승인" }).click();
    await expect(toast(page)).toHaveText(RETRY);
    await expect(row(page, "P1").getByRole("button", { name: "승인" })).toBeEnabled();
    expect(await applicationsOf(id)).toEqual([{ email: DEMO_USERS.P1.email, status: "pending" }]);
  });

  test("C13: 처리 중에는 승인이 '처리 중…'으로 잠기고 거절도 누를 수 없다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**${manage(id)}*`, async (route) => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) await held;
      await route.continue();
    });
    await row(page, "P1").getByRole("button", { name: "승인" }).click();
    await expect(row(page, "P1").getByRole("button", { name: "처리 중…" })).toBeDisabled();
    await expect(row(page, "P1").getByRole("button", { name: "거절" })).toBeDisabled();

    release();
    await expect(toast(page)).toHaveText("승인했어요");
    await expect(page.getByText("승인을 기다리는 신청이 없어요")).toBeVisible();
  });
});

test.describe("MS4 거절", () => {
  test("P11-17: 거절은 O04를 거친다. 돌아가기는 그대로, 거절하면 거절·취소 탭으로", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await row(page, "P1").getByRole("button", { name: "거절" }).click();
    await expect(dialog(page).getByRole("heading")).toHaveText(`${DEMO_USERS.P1.nickname} 님의 신청을 거절할까요?`);
    await expect(dialog(page)).toContainText("거절하면 되돌릴 수 없어요.");
    await dialog(page).getByRole("button", { name: "돌아가기" }).click();
    await expect(dialog(page)).toHaveCount(0);
    expect(await applicationsOf(id)).toEqual([{ email: DEMO_USERS.P1.email, status: "pending" }]);

    // 거절 사유를 골라야 거절된다 (MS14 U10, 사유 화면은 ms14-reject-reason)
    await row(page, "P1").getByRole("button", { name: "거절" }).click();
    await dialog(page).getByText("호스트 사정으로 함께하기 어려워요", { exact: true }).click();
    await dialog(page).getByRole("button", { name: "거절" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(toast(page)).toHaveText("거절했어요");
    await expect(page.getByText("승인을 기다리는 신청이 없어요")).toBeVisible();
    await expect(tabs(page).getByRole("link")).toHaveText(["승인 대기 0", "참여 확정 0", "거절·취소 1"]);
    expect(await applicationsOf(id)).toEqual([{ email: DEMO_USERS.P1.email, status: "rejected" }]);

    await tabs(page).getByRole("link", { name: "거절·취소 1" }).click();
    await expect(row(page, "P1")).toContainText("거절");
  });

  test("P11-15: 거절 중 네트워크 오류면 창을 연 채 안내 + 다시 시도, 다시 누르면 거절된다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await abortActions(page, id);
    await row(page, "P1").getByRole("button", { name: "거절" }).click();
    await dialog(page).getByText("정원이 다 찼어요", { exact: true }).click();
    await dialog(page).getByRole("button", { name: "거절" }).click();
    await expect(dialog(page).getByRole("alert")).toHaveText(RETRY);
    await expect(dialog(page).getByRole("button", { name: "다시 시도" })).toBeEnabled();
    expect(await applicationsOf(id)).toEqual([{ email: DEMO_USERS.P1.email, status: "pending" }]);

    await page.unroute(`**${manage(id)}*`);
    await dialog(page).getByRole("button", { name: "다시 시도" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(toast(page)).toHaveText("거절했어요");
  });
});
