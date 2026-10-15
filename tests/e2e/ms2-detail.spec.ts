import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
import { formatDateTime } from "../../lib/format";
import { expectNoHorizontalScroll } from "./helpers/auth";
import { apiHeaders, createFixtureSocialing, deleteFixtureSocialings, supabaseUrl } from "./helpers/supabase";

// MS2 소셜링 상세 본문 P03 (spec M4, 8.6, 8.7, 8.9 · screen-cases P03-01~03·08~10, E01 · 시나리오 3단계, 호스트 기록 제외)

const infoRow = (page: Page, label: string) => page.locator("dl > div").filter({ hasText: label });

async function readFixture(request: APIRequestContext, id: number) {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialing_summaries?select=title,starts_at,apply_deadline_at,venue_type,venue_name,region_sido,region_sigungu&id=eq.${id}`,
    { headers: apiHeaders() },
  );
  const [row] = await response.json();
  return row as {
    title: string;
    starts_at: string;
    apply_deadline_at: string;
    venue_type: string;
    venue_name: string;
    region_sido: string;
    region_sigungu: string;
  };
}

const LONG_DESCRIPTION = Array.from({ length: 8 }, (_, i) => `${i + 1}번째 줄: 소개가 길면 5줄까지만 보이고 더보기로 펼친다.`).join("\n");

test.describe("MS2 소셜링 상세 P03", () => {
  test("3단계·P03-01·02: 상태, 카테고리·술 여부, 호스트, 정보 목록(스태프 분리), 승인 기준, 소개 더보기", async ({
    page,
    request,
  }) => {
    const id = await createFixtureSocialing({
      host: "B",
      capacity: 4,
      joinType: "approval",
      staffCount: 1,
      accepted: ["A"],
      approvalCriteria: "영어로 3분 정도 자기소개를 할 수 있는 분",
      description: LONG_DESCRIPTION,
    });
    try {
      const row = await readFixture(request, id);
      await page.goto(`/socialings/${id}`);

      await expect(page.getByRole("heading", { level: 1, name: "소셜링 상세" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: row.title })).toBeVisible();
      await expect(page).toHaveTitle(`${row.title} · 문화소셜링`);
      const main = page.getByRole("main");
      await expect(main.getByText("모집중", { exact: true })).toBeVisible();
      await expect(main).toContainText("배움·자기계발 · 술 없음");
      await expect(main).toContainText(`호스트${DEMO_USERS.B.nickname}`);
      // C11 대표 사진 없음 → 카테고리 그림
      await expect(main.locator("img")).toHaveCount(0);

      await expect(infoRow(page, "소셜링 일시")).toContainText(formatDateTime(row.starts_at));
      await expect(infoRow(page, "신청 마감")).toContainText(formatDateTime(row.apply_deadline_at));
      const venue = row.venue_type === "branch" ? `스터디지점 ${row.venue_name}` : row.venue_name;
      await expect(infoRow(page, "장소")).toContainText(venue);
      await expect(infoRow(page, "장소")).toContainText(`${row.region_sido} ${row.region_sigungu}`);
      await expect(infoRow(page, "총 참가비")).toContainText("무료");
      await expect(infoRow(page, "모집 방식")).toContainText("호스트 승인");
      await expect(infoRow(page, "인원")).toContainText("참가자 1/4명 · 스태프 1명");
      await expect(infoRow(page, "인원")).toContainText("스태프는 정원에 세지 않아요");

      await expect(main).toContainText("호스트 승인 기준");
      await expect(main).toContainText("영어로 3분 정도 자기소개를 할 수 있는 분");
      await expect(page.getByRole("heading", { level: 3, name: "호스트" })).toBeVisible();

      // DESIGN.md 상세 배치(MS11): 정보 카드 아이콘 칸(primary-soft), 소셜링 일시·총 참가비 값만 primary-strong,
      // 승인 기준은 notice-box/info(primary-soft), 아래 영역은 위 테두리 없이 그림자 + 위 모서리 2xl, 큰 버튼 글자 700
      await expect(infoRow(page, "소셜링 일시").locator("dt > span")).toHaveCSS("background-color", "rgb(225, 247, 252)");
      await expect(infoRow(page, "소셜링 일시").locator("dd > span").first()).toHaveCSS("color", "rgb(19, 111, 134)");
      await expect(infoRow(page, "총 참가비").locator("dd > span").first()).toHaveCSS("color", "rgb(19, 111, 134)");
      await expect(infoRow(page, "신청 마감").locator("dd > span").first()).toHaveCSS("color", "rgb(17, 24, 39)");
      await expect(main.getByText("호스트 승인 기준", { exact: true }).locator("..")).toHaveCSS(
        "background-color",
        "rgb(225, 247, 252)",
      );
      const bar = page.getByRole("region", { name: "신청" });
      await expect(bar).toHaveCSS("border-top-width", "0px");
      await expect(bar).toHaveCSS("border-top-left-radius", "20px");
      await expect(bar).not.toHaveCSS("box-shadow", "none");
      await expect(bar.getByText("신청하기", { exact: true })).toHaveCSS("font-weight", "700");

      // P03-02 소개 5줄 넘으면 접고 더보기
      const intro = main.locator("p", { hasText: "1번째 줄" });
      expect(await intro.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await main.getByRole("button", { name: "더보기" }).click();
      await expect(main.getByRole("button", { name: "더보기" })).toHaveCount(0);
      expect(await intro.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);

      await expectNoHorizontalScroll(page);
    } finally {
      await deleteFixtureSocialings([id]);
    }
  });

  test("P03-03: 선착순 소셜링에는 승인 기준이 없고, 스태프가 없으면 인원에 스태프를 쓰지 않는다", async ({ page }) => {
    const id = await createFixtureSocialing({ host: "C", approvalCriteria: "선착순에는 보이면 안 됨" });
    try {
      await page.goto(`/socialings/${id}`);
      const main = page.getByRole("main");
      await expect(infoRow(page, "모집 방식")).toContainText("선착순");
      await expect(infoRow(page, "인원")).toHaveText(/참가자 0\/2명$/);
      await expect(main).not.toContainText("호스트 승인 기준");
      await expect(main).not.toContainText("선착순에는 보이면 안 됨");
      await expect(main).toContainText(`호스트${DEMO_USERS.C.nickname}`);
      // 짧은 소개는 접지 않는다
      await expect(main).toContainText("자동 테스트가 만들고 지우는 소셜링");
      await expect(main.getByRole("button", { name: "더보기" })).toHaveCount(0);
    } finally {
      await deleteFixtureSocialings([id]);
    }
  });

  test("3단계: 탐색에서 카드를 눌러 상세 → 뒤로 = 탐색", async ({ page, request }) => {
    const id = await createFixtureSocialing({ host: "B" });
    try {
      const { title } = await readFixture(request, id);
      await page.goto("/explore");
      await page.getByRole("link", { name: title }).click();
      await expect(page).toHaveURL(`/socialings/${id}`);
      await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();

      await page.getByRole("button", { name: "뒤로" }).click();
      await expect(page).toHaveURL("/explore");
    } finally {
      await deleteFixtureSocialings([id]);
    }
  });

  test("E01: 상세 주소로 바로 들어와 뒤로 = 홈", async ({ page }) => {
    const id = await createFixtureSocialing({ host: "B" });
    try {
      await page.goto(`/socialings/${id}`);
      await page.getByRole("button", { name: "뒤로" }).click();
      await expect(page).toHaveURL("/");
    } finally {
      await deleteFixtureSocialings([id]);
    }
  });

  test("P03-08: 없는 소셜링은 '찾을 수 없는 소셜링이에요' + 탐색으로 · 홈으로", async ({ page }) => {
    for (const path of ["/socialings/999999999", "/socialings/abc"]) {
      // loading.tsx로 먼저 흘려보내므로 응답 코드는 200일 수 있다. 화면 안내로 확인한다
      await page.goto(path);
      await expect(page.getByText("찾을 수 없는 소셜링이에요")).toBeVisible();
      await expect(page.getByText("주소가 맞는지 확인해 주세요")).toBeVisible();
      await expect(page.getByRole("link", { name: "탐색으로" })).toHaveAttribute("href", "/explore");
      await expect(page.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
    }
  });

  test("P03-09: 불러오는 동안 사진 칸과 글 막대", async ({ page }) => {
    await page.goto("/socialings/1?_state=loading");
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 상세" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("불러오는 중");
  });

  test("P03-10: 못 불러오면 '불러오지 못했어요' + 다시 시도 · 홈으로", async ({ page }) => {
    await page.goto("/socialings/1?_state=error");
    const alert = page.getByRole("alert").filter({ hasText: "불러오지 못했어요" });
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });
});
