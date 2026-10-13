import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatMonthDay } from "../../lib/format";
import { expectNoHorizontalScroll } from "./helpers/auth";
import { apiHeaders, supabaseUrl } from "./helpers/supabase";

// MS2 홈 P00 (spec M1, 8.2, 8.6, 8.9 · screen-cases P00-01~07 · 시나리오 1단계 "홈 → 전체 보기 → 탐색")
// 다른 테스트가 [E2E] 소셜링을 동시에 만들고 지우므로, DB와 비교하는 부분은 다시 읽어 맞을 때까지 기다린다.

const hero = (page: Page) => page.getByRole("region", { name: "지금 신청할 수 있는 가장 가까운 소셜링" });
const section = (page: Page, name: string) => page.getByRole("region", { name });

async function rest<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${supabaseUrl}/rest/v1/${path}`, { headers: apiHeaders() });
  expect(response.ok()).toBe(true);
  return response.json();
}

test.describe("MS2 홈 P00", () => {
  test("1단계·P00-01: 히어로와 기준, 바로가기, 곧 열리는 소셜링(히어로 뺌), 최근 인증 후기 → 전체 보기 → 탐색", async ({
    page,
    request,
  }) => {
    await page.goto("/");

    // 히어로 = 지금 신청할 수 있는 소셜링 중 일시가 가장 가까운 1개, 곧 열리는 소셜링 = 히어로와 호스트 취소를 뺀 가까운 순 3개
    await expect(async () => {
      await page.reload();
      const [expectedHero] = await rest<{ id: number; title: string }[]>(
        request,
        "socialing_summaries?select=id,title&can_apply=eq.true&order=starts_at.asc,id.asc&limit=1",
      );
      const expectedUpcoming = await rest<{ title: string }[]>(
        request,
        `socialing_summaries?select=title&is_past=eq.false&status=neq.canceled&id=neq.${expectedHero.id}&order=starts_at.asc,id.asc&limit=3`,
      );
      await expect(hero(page).getByRole("heading")).toHaveText(expectedHero.title, { timeout: 2000 });
      await expect(section(page, "곧 열리는 소셜링").getByRole("article").getByRole("heading")).toHaveText(
        expectedUpcoming.map((row) => row.title),
        { timeout: 2000 },
      );
    }).toPass({ timeout: 30_000 });

    await expect(hero(page)).toContainText("지금 신청할 수 있는 가장 가까운 소셜링");
    await expect(hero(page)).toContainText(
      "기준: 지금 신청할 수 있는 소셜링 중 가장 가까운 일시 · 유료로 위에 올리는 소셜링은 없어요",
    );
    await expect(hero(page)).toContainText("모집중");
    await expect(section(page, "곧 열리는 소셜링")).toContainText("기준: 가까운 일시 순 · 맨 위 소셜링은 빼고 보여 줘요");

    // 바로가기: 카테고리 5개(spec 6장 순서), 스터디지점 3곳
    const categories = section(page, "카테고리").getByRole("link");
    await expect(categories).toHaveText(["배움·자기계발", "취미", "운동·활동", "문화·예술", "파티·사교"]);
    await expect(categories.first()).toHaveAttribute("href", "/explore?category=learning");
    const branches = section(page, "스터디지점에서 찾기").getByRole("link");
    await expect(branches).toHaveCount(3);
    await expect(branches.nth(0)).toContainText("강남점");
    await expect(branches.nth(0)).toContainText("서울 강남구");
    await expect(branches.nth(0)).toHaveAttribute("href", /^\/explore\?branch=\d+$/);

    // 최근 인증 후기 2개 (최신순)
    const reviews = await rest<{ body: string; created_at: string; profiles: { nickname: string }; socialings: { title: string } }[]>(
      request,
      "reviews?select=body,created_at,profiles(nickname),socialings(title)&order=created_at.desc,id.desc&limit=2",
    );
    const reviewCards = section(page, "최근 인증 후기").getByRole("article");
    await expect(reviewCards).toHaveCount(2);
    for (const [index, review] of reviews.entries()) {
      await expect(reviewCards.nth(index)).toContainText(
        `${review.profiles.nickname} · ${formatMonthDay(review.created_at)} · ${review.socialings.title}`,
      );
      await expect(reviewCards.nth(index)).toContainText(review.body);
    }
    await expect(section(page, "최근 인증 후기")).toContainText("기준: 최신순 · 참여를 마친 사람만 쓸 수 있어요");
    await expect(page.getByRole("link", { name: "최근 인증 후기 전체 보기" })).toHaveAttribute("href", "/reviews");
    await expectNoHorizontalScroll(page);

    // 1단계: 전체 보기 → 탐색
    await page.getByRole("link", { name: "곧 열리는 소셜링 전체 보기" }).click();
    await expect(page).toHaveURL("/explore");
    await expect(page.getByText("가까운 일시 순 · 유료 노출 없음")).toBeVisible();
  });

  test("히어로를 누르면 그 소셜링 상세", async ({ page }) => {
    await page.goto("/");
    const title = await hero(page).getByRole("heading").textContent();
    await hero(page).getByRole("link").click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    await expect(page.getByRole("heading", { level: 2, name: title! })).toBeVisible();
  });

  test("P00-02·03·04: 신청할 수 있는 소셜링·후기가 없으면 히어로·후기 숨김, 곧 열리는 소셜링 빈 상태", async ({ page }) => {
    await page.goto("/?_state=empty");

    await expect(page.getByText("지금 신청할 수 있는 소셜링이 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "지난 소셜링 보기" })).toHaveAttribute("href", "/past");
    await expect(hero(page)).toHaveCount(0);
    await expect(section(page, "최근 인증 후기")).toHaveCount(0);
    await expect(section(page, "카테고리").getByRole("link")).toHaveCount(5);
  });

  test("P00-05: 후기 묶음만 실패하면 그 자리에만 다시 시도, 나머지는 그대로", async ({ page }) => {
    await page.goto("/?_state=partial");

    const reviews = section(page, "최근 인증 후기");
    await expect(reviews.getByRole("alert")).toContainText("후기를 불러오지 못했어요");
    await expect(reviews.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    await expect(hero(page)).toBeVisible();
    await expect(section(page, "곧 열리는 소셜링").getByRole("article").first()).toBeVisible();
  });

  test("P00-06: 불러오는 동안 히어로·목록 자리에 회색 틀", async ({ page }) => {
    await page.goto("/?_state=loading");
    await expect(page.getByRole("status").first()).toContainText("불러오는 중");
    await expect(page.getByRole("article")).toHaveCount(0);
  });

  test("P00-07: 화면 오류는 '불러오지 못했어요' + 다시 시도 · 홈으로", async ({ page }) => {
    await page.goto("/?_state=error");
    const alert = page.getByRole("alert").filter({ hasText: "불러오지 못했어요" });
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });
});
