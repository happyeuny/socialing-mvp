import { expect, test } from "@playwright/test";

test.describe("MS1 골격", () => {
  test("P00 홈이 열리고 390px에서 가로 스크롤이 없다", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("문화소셜링");
    // 홈 제목(h1)은 화면 읽기용. 보이는 이름은 머리글의 "문화소셜링" (MS2 홈)
    await expect(page.getByRole("heading", { level: 1, name: "문화소셜링 홈" })).toBeAttached();
    await expect(page.getByRole("banner").getByRole("link", { name: "문화소셜링" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("DESIGN.md 토큰과 글꼴이 적용된다", async ({ page }) => {
    await page.goto("/");

    const body = page.locator("body");
    // surface-bg #F4FAFF, text-primary #111827
    await expect(body).toHaveCSS("background-color", "rgb(244, 250, 255)");
    await expect(body).toHaveCSS("color", "rgb(17, 24, 39)");
    await expect(body).toHaveCSS("font-family", /Noto Sans KR/);

    // title-xl 22px / 28px / 800, 자간 -0.02em (홈에는 보이는 큰 제목이 없어 탐색 제목으로 확인)
    await page.goto("/explore");
    const heading = page.getByRole("heading", { level: 1, name: "탐색" });
    await expect(heading).toHaveCSS("font-size", "22px");
    await expect(heading).toHaveCSS("line-height", "28px");
    await expect(heading).toHaveCSS("font-weight", "800");
    await expect(heading).toHaveCSS("letter-spacing", "-0.44px");

    // 앱 안에 넣은 글꼴 파일이 실제로 불러와진다 (Google Fonts 접속 없음)
    const loadedFaces = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts]
        .filter((face) => face.family.replace(/"/g, "") === "Noto Sans KR Variable" && face.status === "loaded")
        .length;
    });
    expect(loadedFaces).toBeGreaterThan(0);
  });
});
