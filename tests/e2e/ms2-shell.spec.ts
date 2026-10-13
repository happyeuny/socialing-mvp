import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";

// MS2 머리글과 아래 탭 (spec 8.1, 8.7, DESIGN.md header-main · header-sub · tab-bar, screen-cases C01·C02·E01)

const tabBar = (page: Page) => page.getByRole("navigation", { name: "아래 탭" });

test.describe("MS2 머리글과 아래 탭", () => {
  test("C01: 비로그인 머리글은 '문화소셜링'과 '로그인', 로그인하면 보던 주소로 돌아온다", async ({ page }) => {
    await page.goto("/explore");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "문화소셜링" })).toHaveAttribute("href", "/");
    await header.getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL("/login?next=%2Fexplore");

    await submitLogin(page, "A");
    await expect(page).toHaveURL("/explore");
  });

  test("C02: 로그인하면 머리글 오른쪽에 닉네임 첫 글자 원, 누르면 내 소셜링", async ({ page }) => {
    await page.goto("/login");
    await submitLogin(page, "A");
    await expect(page).toHaveURL("/");

    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "로그인" })).toHaveCount(0);
    const avatar = header.getByRole("link", { name: `내 소셜링 (${DEMO_USERS.A.nickname})` });
    await expect(avatar).toHaveText(Array.from(DEMO_USERS.A.nickname)[0]);
    // avatar-initial/strong: primary-strong #136F86 바탕, 28px
    await expect(avatar.locator("span")).toHaveCSS("background-color", "rgb(19, 111, 134)");
    await expect(avatar.locator("span")).toHaveCSS("width", "28px");

    await avatar.click();
    await expect(page).toHaveURL("/me");
    await expect(page.getByTestId("profile-nickname")).toHaveText(DEMO_USERS.A.nickname);
  });

  test("아래 탭 4개: 누르면 그 화면으로 가고 그 탭만 활성", async ({ page }) => {
    await page.goto("/");
    const tabs = tabBar(page);
    await expect(tabs.getByRole("link")).toHaveText(["홈", "탐색", "후기", "내 소셜링"]);
    await expect(tabs.getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");

    await tabs.getByRole("link", { name: "탐색" }).click();
    await expect(page).toHaveURL("/explore");
    await expect(page.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();
    await expect(page.getByText("가까운 일시 순 · 유료 노출 없음")).toBeVisible();
    await expect(tabs.getByRole("link", { name: "탐색" })).toHaveAttribute("aria-current", "page");
    await expect(tabs.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current", "page");
    // 활성 탭은 primary-strong, 비활성은 text-muted
    await expect(tabs.getByRole("link", { name: "탐색" })).toHaveCSS("color", "rgb(19, 111, 134)");
    await expect(tabs.getByRole("link", { name: "홈" })).toHaveCSS("color", "rgb(107, 114, 128)");

    await expect(tabs.getByRole("link", { name: "후기" })).toHaveAttribute("href", "/reviews");

    // 비로그인으로 내 소셜링 탭 → 로그인 → 내 소셜링 (E03)
    await tabs.getByRole("link", { name: "내 소셜링" }).click();
    await expect(page).toHaveURL("/login?next=%2Fme");
  });

  test("하위 화면은 header-sub(뒤로 + 제목)이고 아래 탭이 없다", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("banner").getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
    await expect(page.getByRole("button", { name: "뒤로" })).toBeVisible();
    await expect(tabBar(page)).toHaveCount(0);
  });

  test("뒤로: 앱 안 이전 화면이 있으면 그 화면으로", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("banner").getByRole("link", { name: "로그인" }).click();
    await expect(page).toHaveURL("/login?next=%2Fexplore");

    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/explore");
  });

  test("E01: 주소로 바로 들어온 하위 화면에서 뒤로 = 홈", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/");
    await expect(tabBar(page).getByRole("link", { name: "홈" })).toHaveAttribute("aria-current", "page");
  });

  test("390px에서 가로 스크롤이 없고, 아래 탭이 화면 맨 아래에 붙어 있다", async ({ page }) => {
    await page.goto("/explore");
    await expectNoHorizontalScroll(page);

    const box = await tabBar(page).boundingBox();
    const viewport = page.viewportSize();
    expect(box?.height).toBe(64);
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(viewport?.height);
    expect(box?.width).toBe(390);
  });
});
