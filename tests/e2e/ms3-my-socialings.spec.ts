import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  addReview,
  createFixtureSocialing,
  deleteFixtureSocialings,
  type FixtureOptions,
} from "./helpers/supabase";

// MS3 내 소셜링 P06 (spec M11, 8.6 · DESIGN.md top-tabs, socialing-card/my-application·host, profile-row
// · 시나리오 6단계 · screen-cases P06-01~13). 시드 데이터는 그대로 두고 테스트 전용 [E2E] 소셜링만 골라 본다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

const tabs = (page: Page) => page.getByRole("navigation", { name: "내 소셜링 보기" });
const section = (page: Page, name: string) => page.getByRole("region", { name });
const card = (page: Page, href: string) => page.locator("article").filter({ has: page.locator(`a[href="${href}"]`) });

/** 그 묶음 안에서 주어진 소셜링 카드들이 놓인 순서 */
async function orderIn(page: Page, sectionName: string, hrefs: string[]) {
  const all = await section(page, sectionName)
    .locator("article h2 a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  return all.filter((href): href is string => href !== null && hrefs.includes(href));
}

async function loginAs(page: Page, user: "C" | "P1", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

test.describe("MS3 내 소셜링: 신청한 소셜링", () => {
  test("시나리오 6단계·P06-01~07: 다가오는 → 지난 순서, 상태 배지 + 신청 칩, 내가 취소한 신청은 없음, 후기 쓰기", async ({
    page,
  }) => {
    const [pending, confirmed, rejected, withdrawn, reapplied, hostCanceled, reviewable, reviewed] = await Promise.all([
      fixture({ host: "C", joinType: "approval", deadlineInHours: 20, startsInHours: 30 }),
      fixture({ host: "C", joinType: "approval", status: "confirmed", startsInHours: 60, accepted: ["P1"] }),
      fixture({ host: "C", joinType: "approval", startsInHours: 70 }),
      fixture({ host: "C", startsInHours: 80 }),
      fixture({ host: "C", joinType: "approval", startsInHours: 85 }),
      fixture({ host: "C", status: "canceled", startsInHours: 90, accepted: ["P1"] }),
      fixture({ host: "C", status: "completed", deadlineInHours: -30, startsInHours: -24, accepted: ["P1"] }),
      fixture({ host: "C", status: "completed", deadlineInHours: -60, startsInHours: -48, accepted: ["P1"] }),
    ]);
    await Promise.all([
      addApplication(pending, "P1", "pending"),
      addApplication(rejected, "P1", "rejected"),
      addApplication(withdrawn, "P1", "canceled"),
      addApplication(reapplied, "P1", "canceled").then(() => addApplication(reapplied, "P1", "pending")),
      addReview(reviewed, "P1"),
    ]);
    await loginAs(page, "P1", "/me");

    await expect(tabs(page).getByRole("link", { name: "신청한 소셜링" })).toHaveAttribute("aria-current", "page");
    const detail = (id: number) => `/socialings/${id}`;

    // P06-01: 다가오는 소셜링(가까운 일시 순)이 먼저, 지난 소셜링(최근 순)이 뒤
    await expect(section(page, "다가오는 소셜링")).toContainText("가까운 일시 순");
    await expect(section(page, "지난 소셜링")).toContainText("최근 순");
    expect(
      await orderIn(page, "다가오는 소셜링", [pending, confirmed, rejected, withdrawn, reapplied, hostCanceled].map(detail)),
    ).toEqual([pending, confirmed, rejected, reapplied, hostCanceled].map(detail));
    expect(await orderIn(page, "지난 소셜링", [reviewable, reviewed].map(detail))).toEqual(
      [reviewable, reviewed].map(detail),
    );

    // P06-02~05: 상태 배지가 앞, 신청 칩이 뒤. 호스트 취소는 배지 하나만.
    // MS15: 참여 확정이 최소 인원(2명)보다 적은 모집중은 배지와 칩 사이에 꼬리표 "최소 인원까지 2명"(카드 공통, spec 8.5)
    const pills = (id: number) => card(page, detail(id)).locator("h2").locator("xpath=preceding-sibling::div[1]");
    await expect(pills(pending)).toHaveText(/^모집중\s*최소 인원까지 2명\s*승인 대기$/);
    // 시나리오 6단계: 참여 확정과 확정 상태
    await expect(pills(confirmed)).toHaveText(/^확정\s*참여 확정$/);
    await expect(pills(rejected)).toHaveText(/^모집중\s*최소 인원까지 2명\s*거절$/);
    // P06-06: 내가 신청 취소한 소셜링은 없고, 취소 뒤 다시 신청했으면 새 신청으로 보인다
    await expect(card(page, detail(withdrawn))).toHaveCount(0);
    await expect(pills(reapplied)).toHaveText(/^모집중\s*최소 인원까지 2명\s*승인 대기$/);
    await expect(pills(hostCanceled)).toHaveText(/^호스트 취소$/);

    // P06-07: 후기를 쓸 수 있는 카드에만 "후기 쓰기"
    await expect(card(page, detail(reviewable)).getByRole("link", { name: "후기 쓰기" })).toHaveAttribute(
      "href",
      `/socialings/${reviewable}/review`,
    );
    await expect(card(page, detail(reviewed)).getByRole("link", { name: "후기 쓰기" })).toHaveCount(0);
    await expect(card(page, detail(confirmed)).getByRole("link", { name: "후기 쓰기" })).toHaveCount(0);

    // 카드를 누르면 상세
    await card(page, detail(confirmed)).getByRole("link").first().click();
    await expect(page).toHaveURL(detail(confirmed));

    await page.goto("/me");
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});

test.describe("MS3 내 소셜링: 호스트인 소셜링", () => {
  test("P06-09·P06-10: 카드 → 관리, 승인 대기 건수(없으면 안 보임), 새 소셜링 만들기", async ({ page }) => {
    const [withPending, noPending] = await Promise.all([
      fixture({ host: "C", joinType: "approval", capacity: 5, startsInHours: 40 }),
      fixture({ host: "C", startsInHours: 50 }),
    ]);
    await addApplication(withPending, "P1", "pending");
    await addApplication(withPending, "P2", "pending");
    await addApplication(withPending, "P3", "accepted");
    await loginAs(page, "C", "/me");

    await tabs(page).getByRole("link", { name: "호스트인 소셜링" }).click();
    await expect(page).toHaveURL("/me?tab=host");
    await expect(tabs(page).getByRole("link", { name: "호스트인 소셜링" })).toHaveAttribute("aria-current", "page");

    const manage = (id: number) => `/socialings/${id}/manage`;
    await expect(card(page, manage(withPending))).toContainText("승인 대기 2");
    await expect(card(page, manage(withPending))).toContainText("소셜링 관리");
    await expect(card(page, manage(noPending))).not.toContainText("승인 대기");
    await expect(card(page, manage(noPending))).toContainText("소셜링 관리");
    expect(await orderIn(page, "다가오는 소셜링", [withPending, noPending].map(manage))).toEqual(
      [withPending, noPending].map(manage),
    );
    await expect(page.getByRole("link", { name: "새 소셜링 만들기" })).toHaveAttribute("href", "/socialings/new");
    await expectNoHorizontalScroll(page);
  });
});

test.describe("MS3 내 소셜링: 빈 상태·로딩·오류", () => {
  test("P06-08·P06-11: 빈 상태와 다음 행동 (?_state=empty)", async ({ page }) => {
    await loginAs(page, "P1", "/me?_state=empty");
    await expect(page.getByText("아직 신청한 소셜링이 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "탐색하기" })).toHaveAttribute("href", "/explore");

    await page.goto("/me?tab=host&_state=empty");
    await expect(page.getByText("아직 연 소셜링이 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "새 소셜링 만들기" })).toHaveAttribute("href", "/socialings/new");
  });

  test("P06-12·P06-13: 탭 자리만 로딩·오류, 닉네임과 탭은 그대로", async ({ page }) => {
    await loginAs(page, "P1", "/me?_state=loading");
    await expect(page.getByRole("status")).toContainText("불러오는 중");
    await expect(page.getByTestId("profile-nickname")).toBeVisible();

    await page.goto("/me?tab=host&_state=error");
    // Next.js 경로 안내(route announcer)도 role="alert"라 글자로 고른다
    await expect(page.getByRole("alert").filter({ hasText: "불러오지 못했어요" })).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByTestId("profile-nickname")).toBeVisible();
    await expect(tabs(page).getByRole("link", { name: "호스트인 소셜링" })).toHaveAttribute("aria-current", "page");
  });
});
