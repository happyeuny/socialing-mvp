import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  createFixtureSocialing,
  deleteFixtureSocialings,
  type FixtureOptions,
} from "./helpers/supabase";

// MS4 소셜링 관리 P11 보기 (spec 8.8, 8.6, 8.7, screen-cases P11-07~11·21·22, E02, E05)
// 승인·거절 버튼은 ms4-decide, 상태 버튼은 ms4-status. 시드 데이터는 건드리지 않고 호스트 C의 테스트 소셜링을 쓴다.

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
const steps = (page: Page) => page.getByRole("list", { name: "소셜링 진행 단계" });
const applicantTabs = (page: Page) => page.getByRole("navigation", { name: "신청자 보기" });
const applicantList = (page: Page) => page.getByRole("list", { name: "신청자 목록" });

async function loginAs(page: Page, user: "C" | "P1", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

test.describe("MS4 P11 들어가기", () => {
  test("E02: 비로그인으로 관리 주소 → 로그인 → 관리 화면으로 돌아온다", async ({ page }) => {
    const id = await fixture({ host: "C" });
    await page.goto(manage(id));
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(manage(id))}`);
    await submitLogin(page, "C");
    await expect(page).toHaveURL(manage(id));
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 관리" })).toBeVisible();
  });

  test("E05·완료 기준: 호스트가 아닌 사람은 상세로 가고 '호스트만 볼 수 있어요', 상세에 관리하기가 없다", async ({ page }) => {
    const id = await fixture({ host: "C" });
    await loginAs(page, "P1", "/me");
    await page.goto(manage(id));
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByText("호스트만 볼 수 있어요")).toBeVisible();
    await expect(page.getByRole("region", { name: "신청" }).getByRole("link", { name: /관리하기/ })).toHaveCount(0);
    // 새로 고쳐도 안내가 다시 뜨지 않는다
    await page.reload();
    await expect(page.getByRole("region", { name: "신청" })).toBeVisible();
    await expect(page.getByText("호스트만 볼 수 있어요")).toHaveCount(0);
  });

  test("없는 소셜링의 관리 주소 → 찾을 수 없는 소셜링", async ({ page }) => {
    await loginAs(page, "C", "/me");
    await page.goto(manage(999_999_999));
    await expect(page.getByText("찾을 수 없는 소셜링이에요")).toBeVisible();
  });

  test("P03-B01 → P11, P11 '상세 보기 ›' → P03, P06-09 호스트 카드 → P11", async ({ page }) => {
    const id = await fixture({ host: "C", startsInHours: 60 });
    await loginAs(page, "C", `/socialings/${id}`);

    await page.getByRole("region", { name: "신청" }).getByRole("link", { name: "관리하기", exact: true }).click();
    await expect(page).toHaveURL(manage(id));
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 관리" })).toBeVisible();

    await page.getByRole("link", { name: "상세 보기" }).click();
    await expect(page).toHaveURL(`/socialings/${id}`);

    await page.goto("/me?tab=host");
    await page.locator(`article:has(a[href="${manage(id)}"])`).getByRole("link").first().click();
    await expect(page).toHaveURL(manage(id));
  });
});

test.describe("MS4 P11 보기", () => {
  test("P11-07·09~11: 호스트 승인 방식은 탭 3개와 건수, 닉네임·신청 일시, 빈 상태", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval", capacity: 4, staffCount: 1, accepted: ["P1"] });
    await addApplication(id, "P2", "pending");
    await addApplication(id, "P3", "pending");
    await addApplication(id, "P4", "rejected");
    await addApplication(id, "P5", "canceled");
    await loginAs(page, "C", manage(id));

    // 요약 카드: 상태, 일시 · 장소 · 모집 방식, 참가자 · 스태프 · 승인 대기
    await expect(summary(page)).toContainText("모집중");
    await expect(summary(page).getByRole("heading", { level: 2 })).toContainText("[E2E]");
    await expect(summary(page)).toContainText("호스트 승인");
    await expect(summary(page)).toContainText("참가자 1/4명");
    await expect(summary(page)).toContainText("스태프 1명");
    await expect(summary(page)).toContainText("승인 대기 2");

    await expect(applicantTabs(page).getByRole("link")).toHaveText(["승인 대기 2", "참여 확정 1", "거절·취소 2"]);
    await expect(applicantTabs(page).getByRole("link", { name: "승인 대기 2" })).toHaveAttribute("aria-current", "page");
    await expect(applicantList(page).getByRole("listitem")).toHaveCount(2);
    await expect(applicantList(page)).toContainText(DEMO_USERS.P2.nickname);
    await expect(applicantList(page)).toContainText(DEMO_USERS.P3.nickname);
    await expect(applicantList(page).getByRole("listitem").first()).toContainText(/\d+\/\d+ 오[전후] \d+:\d{2} 신청/);

    await applicantTabs(page).getByRole("link", { name: "참여 확정 1" }).click();
    await expect(page).toHaveURL(`${manage(id)}?tab=accepted`);
    await expect(applicantList(page).getByRole("listitem")).toHaveCount(1);
    await expect(applicantList(page)).toContainText(DEMO_USERS.P1.nickname);
    await expect(applicantList(page)).toContainText("참여 확정");

    await applicantTabs(page).getByRole("link", { name: "거절·취소 2" }).click();
    await expect(page).toHaveURL(`${manage(id)}?tab=closed`);
    const rows = applicantList(page).getByRole("listitem");
    await expect(rows.filter({ hasText: DEMO_USERS.P4.nickname })).toContainText("거절");
    await expect(rows.filter({ hasText: DEMO_USERS.P5.nickname })).toContainText("신청 취소");

    // P11-09 승인 대기 0
    const empty = await fixture({ host: "C", joinType: "approval" });
    await page.goto(manage(empty));
    await expect(page.getByText("승인을 기다리는 신청이 없어요")).toBeVisible();
    await page.goto(`${manage(empty)}?tab=accepted`);
    await expect(page.getByText("아직 참여 확정자가 없어요")).toBeVisible();
    await expect(summary(page)).not.toContainText("승인 대기");
  });

  test("P11-08·10: 선착순은 탭 없이 참여 확정 목록만 (신청 취소한 사람은 안 보임)", async ({ page }) => {
    const id = await fixture({ host: "C", capacity: 5, accepted: ["P1", "P2"] });
    await addApplication(id, "P3", "canceled");
    await loginAs(page, "C", manage(id));

    await expect(applicantTabs(page)).toHaveCount(0);
    await expect(page.getByText("선착순이라 신청하면 바로 참여 확정돼요")).toBeVisible();
    await expect(applicantList(page).getByRole("listitem")).toHaveCount(2);
    await expect(applicantList(page)).not.toContainText(DEMO_USERS.P3.nickname);
    await expect(summary(page)).toContainText("선착순");
    await expect(summary(page)).toContainText("참가자 2/5명");

    const empty = await fixture({ host: "C" });
    await page.goto(manage(empty));
    await expect(page.getByText("아직 참여 확정자가 없어요")).toBeVisible();
  });

  test("진행 단계: 모집중 · 확정 · 종료 · 호스트 취소", async ({ page }) => {
    const [recruiting, confirmed, completed, canceled] = await Promise.all([
      fixture({ host: "C" }),
      fixture({ host: "C", status: "confirmed" }),
      fixture({ host: "C", status: "completed", deadlineInHours: -30, startsInHours: -24 }),
      fixture({ host: "C", status: "canceled" }),
    ]);
    await loginAs(page, "C", manage(recruiting));
    const current = () => steps(page).locator('[aria-current="step"]');

    await expect(current()).toContainText("모집중");
    await page.goto(manage(confirmed));
    await expect(current()).toContainText("확정");
    await page.goto(manage(completed));
    await expect(current()).toContainText("종료");
    await page.goto(manage(canceled));
    await expect(current()).toHaveCount(0);
    await expect(page.getByRole("region", { name: "소셜링 요약" })).toContainText("호스트 취소");
    await expect(page.locator("#manage-status").locator("..")).toContainText("호스트 취소");
  });

  test("P11-21·22: 로딩과 화면 오류 (?_state=loading, ?_state=error), 390px·320px 가로 스크롤 없음", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval", accepted: ["P1"] });
    await addApplication(id, "P2", "pending");
    await loginAs(page, "C", manage(id));
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(`${manage(id)}?_state=loading`);
    await expect(page.getByRole("status")).toContainText("불러오는 중");

    await page.goto(`${manage(id)}?_state=error`);
    await expect(page.getByRole("alert").filter({ hasText: "불러오지 못했어요" })).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
  });
});
