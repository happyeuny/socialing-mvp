import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
import { formatDateTime } from "../../lib/format";
import { expectNoHorizontalScroll } from "./helpers/auth";
import { apiHeaders, createFixtureSocialing, deleteFixtureSocialings, supabaseUrl } from "./helpers/supabase";

// MS2 탐색 P01과 소셜링 카드 (spec M1, M2, 8.3, 8.5, 8.6 · screen-cases P01-01·06·07·08, C03~C11 · 시나리오 1단계의 탐색)
// 다른 테스트가 [E2E] 소셜링을 동시에 만들고 지우므로, 순서 비교에서는 [E2E] 소셜링을 뺀다.

const cards = (page: Page) => page.getByRole("article");
const cardOf = (page: Page, title: string) => cards(page).filter({ has: page.getByRole("heading", { name: title }) });
const notFixture = (title: string) => !title.startsWith("[E2E]");

async function readFixture(request: APIRequestContext, id: number) {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialing_summaries?select=title,starts_at,venue_type,venue_name,region_sigungu&id=eq.${id}`,
    { headers: apiHeaders() },
  );
  const [row] = await response.json();
  return row as { title: string; starts_at: string; venue_type: string; venue_name: string; region_sigungu: string };
}

test.describe("MS2 탐색 P01", () => {
  test("1단계·P01-01: 지난 소셜링 없이 가까운 일시 순, 기준 문구와 개수", async ({ page, request }) => {
    await page.goto("/explore");

    await expect(page.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();
    await expect(page.getByText("가까운 일시 순 · 유료 노출 없음")).toBeVisible();
    await expect(cards(page).first()).toBeVisible();

    const shownTitles = await cards(page).getByRole("heading", { level: 2 }).allTextContents();
    await expect(page.getByText(`소셜링 ${shownTitles.length}개`)).toBeVisible();

    const response = await request.get(
      `${supabaseUrl}/rest/v1/socialing_summaries?select=title&is_past=eq.false&order=starts_at.asc,id.asc`,
      { headers: apiHeaders() },
    );
    const expectedTitles = ((await response.json()) as { title: string }[]).map((row) => row.title);
    expect(shownTitles.filter(notFixture)).toEqual(expectedTitles.filter(notFixture));
    expect(shownTitles.filter(notFixture).length).toBeGreaterThan(0);

    await expect(page.getByRole("link", { name: "지난 소셜링 보기" })).toHaveAttribute("href", "/past");
    await expectNoHorizontalScroll(page);
  });

  test("C03~C11: 카드에 배지·꼬리표, 카테고리·술 여부, 일시·장소, 호스트·인원·총 참가비", async ({ page, request }) => {
    const full = await createFixtureSocialing({ host: "B", capacity: 2, accepted: ["A", "P1"] });
    const closed = await createFixtureSocialing({ host: "B", status: "confirmed", deadlineInHours: -1, accepted: ["A"] });
    const canceled = await createFixtureSocialing({ host: "B", status: "canceled" });
    try {
      const [fullRow, closedRow, canceledRow] = await Promise.all(
        [full, closed, canceled].map((id) => readFixture(request, id)),
      );
      await page.goto("/explore");

      // C05 모집중 + 정원 마감
      const fullCard = cardOf(page, fullRow.title);
      await expect(fullCard).toContainText("모집중");
      await expect(fullCard).toContainText("정원 마감");
      await expect(fullCard).toContainText("배움·자기계발 · 술 없음");
      const place = fullRow.venue_type === "branch" ? fullRow.venue_name : fullRow.region_sigungu;
      await expect(fullCard).toContainText(`${formatDateTime(fullRow.starts_at)} · ${place}`);
      await expect(fullCard).toContainText(DEMO_USERS.B.nickname);
      await expect(fullCard).toContainText("2/2명");
      await expect(fullCard).toContainText("무료");
      // status-badge/recruiting: 흰 바탕 + primary-strong 테두리
      const recruitingBadge = fullCard.getByText("모집중", { exact: true });
      await expect(recruitingBadge).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(recruitingBadge).toHaveCSS("border-color", "rgb(19, 111, 134)");
      // C11 대표 사진 없음 → 카테고리 그림 (사진 태그 없음)
      await expect(fullCard.locator("img")).toHaveCount(0);

      // C07 확정 + 신청 마감 (확정 배지는 primary 채움)
      const closedCard = cardOf(page, closedRow.title);
      await expect(closedCard.getByText("확정", { exact: true })).toHaveCSS("background-color", "rgb(89, 203, 232)");
      await expect(closedCard).toContainText("신청 마감");
      await expect(closedCard).toContainText("1/2명");

      // C10 호스트 취소: 꼬리표 없음
      const canceledCard = cardOf(page, canceledRow.title);
      await expect(canceledCard).toContainText("호스트 취소");
      await expect(canceledCard).not.toContainText("신청 마감");
      await expect(canceledCard).not.toContainText("정원 마감");

      // 카드 어디를 눌러도 상세로 간다
      await fullCard.click({ position: { x: 24, y: 24 } });
      await expect(page).toHaveURL(`/socialings/${full}`);
    } finally {
      await deleteFixtureSocialings([full, closed, canceled]);
    }
  });

  test("P01-06: 열린 소셜링이 없으면 안내와 '지난 소셜링 보기'", async ({ page }) => {
    await page.goto("/explore?_state=empty");

    await expect(page.getByText("지금 열린 소셜링이 없어요")).toBeVisible();
    await expect(page.getByRole("link", { name: "지난 소셜링 보기" })).toHaveAttribute("href", "/past");
    await expect(page.getByText(/^소셜링 \d+개$/)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(0);
  });

  test("P01-07: 불러오는 동안 제목은 보이고 목록 자리에 회색 틀", async ({ page }) => {
    await page.goto("/explore?_state=loading");

    await expect(page.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("불러오는 중");
    await expect(cards(page)).toHaveCount(0);
  });

  test("P01-08: 목록을 못 불러오면 '불러오지 못했어요' + 다시 시도 · 홈으로", async ({ page }) => {
    await page.goto("/explore?_state=error");

    const alert = page.getByRole("alert").filter({ hasText: "불러오지 못했어요" });
    await expect(alert).toContainText("불러오지 못했어요");
    await expect(alert).toContainText("연결을 확인하고 다시 시도해 주세요");
    await expect(page.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();

    await alert.getByRole("button", { name: "다시 시도" }).click();
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    await expect(alert).toContainText("불러오지 못했어요");

    await alert.getByRole("link", { name: "홈으로" }).click();
    await expect(page).toHaveURL("/");
  });
});
