import { expect, test, type Page } from "@playwright/test";
import { apiHeaders, createFixtureSocialing, deleteFixtureSocialings, supabaseUrl } from "./helpers/supabase";

// MS2 지난 소셜링 P02 (spec M1, 8.2, 8.6, 8.7, 8.9 · screen-cases P02-01~04)
// 다른 테스트가 [E2E] 소셜링을 동시에 만들고 지우므로, 시드 순서 비교에서는 [E2E] 소셜링을 뺀다.

const cards = (page: Page) => page.getByRole("article");
const notFixture = (title: string) => !title.startsWith("[E2E]");

test.describe("MS2 지난 소셜링 P02", () => {
  test("P02-01: 일시가 지난 소셜링이 최근 순이고 상태는 그대로(종료·호스트 취소·모집중)", async ({ page, request }) => {
    // 확정하지 않은 채 일시가 지난 모집중(1시간 전), 종료(2시간 전), 호스트 취소(3시간 전)
    const ids = [
      await createFixtureSocialing({ host: "B", status: "recruiting", deadlineInHours: -4, startsInHours: -1 }),
      await createFixtureSocialing({ host: "B", status: "completed", deadlineInHours: -4, startsInHours: -2 }),
      await createFixtureSocialing({ host: "B", status: "canceled", deadlineInHours: -4, startsInHours: -3 }),
    ];
    try {
      const response = await request.get(
        `${supabaseUrl}/rest/v1/socialing_summaries?select=id,title&is_past=eq.true&order=starts_at.desc,id.desc`,
        { headers: apiHeaders() },
      );
      const rows = (await response.json()) as { id: number; title: string }[];
      const fixtureTitles = ids.map((id) => rows.find((row) => row.id === id)!.title);

      await page.goto("/past");
      await expect(page.getByRole("heading", { level: 1, name: "지난 소셜링" })).toBeVisible();
      await expect(page.getByText("소셜링 일시가 지난 소셜링 · 최근 순")).toBeVisible();
      await expect(cards(page).first()).toBeVisible();

      const shownTitles = await cards(page).getByRole("heading", { level: 2 }).allTextContents();
      expect(shownTitles.filter(notFixture)).toEqual(rows.map((row) => row.title).filter(notFixture));
      expect(shownTitles.filter((title) => fixtureTitles.includes(title))).toEqual(fixtureTitles);

      const cardOf = (title: string) => cards(page).filter({ has: page.getByRole("heading", { name: title }) });
      // MS15: 확정하지 않은 채 일시가 지난 모집중은 보이는 상태가 취소(최소 인원 미달)라 꼬리표 "신청 마감"이 없다.
      // 배지는 저장된 상태(모집중) 그대로이고, "취소" 배지는 상태 표시 PR(MS15 PR 3)에서
      await expect(cardOf(fixtureTitles[0])).toContainText("모집중");
      await expect(cardOf(fixtureTitles[0])).not.toContainText("신청 마감");
      await expect(cardOf(fixtureTitles[1])).toContainText("종료");
      await expect(cardOf(fixtureTitles[1])).not.toContainText("신청 마감");
      await expect(cardOf(fixtureTitles[2])).toContainText("호스트 취소");

      // 지난 소셜링은 탐색에 없다
      await page.goto("/explore");
      await expect(cards(page).first()).toBeVisible();
      for (const title of fixtureTitles) {
        await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
      }
    } finally {
      await deleteFixtureSocialings(ids);
    }
  });

  test("탐색 → 지난 소셜링 → 뒤로 = 탐색, 지난 소셜링에는 아래 탭이 있고 탐색이 켜져 있다", async ({ page }) => {
    await page.goto("/explore");
    await page.getByRole("link", { name: "지난 소셜링 보기" }).click();
    await expect(page).toHaveURL("/past");

    // 위는 뒤로 버튼이 있는 머리글, 아래 탭은 탐색이 켜짐 (탐색 화면 자체는 아니라 aria-current="true")
    await expect(page.getByRole("button", { name: "뒤로" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "아래 탭" });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole("link", { name: "탐색" })).toHaveAttribute("aria-current", "true");
    await expect(tabs.getByRole("link", { name: "탐색" })).toHaveCSS("color", "rgb(19, 111, 134)");
    await expect(tabs.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");

    // 맨 아래까지 내려도 마지막 카드가 아래 탭에 가리지 않는다
    await expect(cards(page).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const lastCard = await cards(page).last().boundingBox();
    const tabBox = await tabs.boundingBox();
    expect((lastCard?.y ?? 0) + (lastCard?.height ?? 0)).toBeLessThanOrEqual(tabBox?.y ?? 0);

    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/explore");

    // 아래 탭 탐색은 필터 없는 탐색으로
    await page.goto("/past");
    await tabs.getByRole("link", { name: "탐색" }).click();
    await expect(page).toHaveURL("/explore");
  });

  test("P02-02: 지난 소셜링이 없으면 안내와 '탐색으로'", async ({ page }) => {
    await page.goto("/past?_state=empty");

    await expect(page.getByText("지난 소셜링이 아직 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "탐색으로" })).toHaveAttribute("href", "/explore");
    await expect(cards(page)).toHaveCount(0);
  });

  test("P02-03: 불러오는 동안 목록 자리에 회색 틀", async ({ page }) => {
    await page.goto("/past?_state=loading");

    await expect(page.getByRole("heading", { level: 1, name: "지난 소셜링" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("불러오는 중");
  });

  test("P02-04: 목록을 못 불러오면 '불러오지 못했어요' + 다시 시도 · 홈으로", async ({ page }) => {
    await page.goto("/past?_state=error");

    const alert = page.getByRole("alert").filter({ hasText: "불러오지 못했어요" });
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });
});
