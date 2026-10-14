import { expect, test, type Page } from "@playwright/test";
import {
  dateFilterRange,
  exploreSearch,
  filterSocialings,
  parseExploreFilter,
  withHideParty,
  type FilterCatalog,
  type FilterableSocialing,
} from "../../lib/explore-filter";
import { expectNoHorizontalScroll } from "./helpers/auth";

// MS6 탐색 필터 계산과 "파티·사교 숨기기" (spec M2, M3, 6장 날짜 필터, 8.6 P01, 8.7 · screen-cases P01-03·05, E15)
// 계산 규칙(날짜·주소·거르기)은 브라우저 없이 함수로, 화면은 시드 소셜링으로 본다. 다른 테스트가 잠깐 만드는
// [E2E] 소셜링(배움·자기계발, 강남점)이 목록에 섞일 수 있어 개수는 정확히 세지 않는다.

const iso = (date: Date) => date.toISOString();

test.describe("MS6 날짜 필터 계산 (한국 시간, 완료 기준 3)", () => {
  // 2026-10-14(수) 15:00 한국 시간
  const wednesday = new Date("2026-10-14T06:00:00Z");

  test("수요일: 오늘 = 그날 0~24시, 이번 주 = 일요일 끝까지, 이번 주말 = 토·일", () => {
    expect(dateFilterRange("today", wednesday)).toEqual({
      start: new Date("2026-10-13T15:00:00Z"), // 10/14 0시 한국
      end: new Date("2026-10-14T15:00:00Z"),
    });
    expect(iso(dateFilterRange("week", wednesday).end)).toBe("2026-10-18T15:00:00.000Z"); // 10/19(월) 0시
    expect(dateFilterRange("weekend", wednesday)).toEqual({
      start: new Date("2026-10-16T15:00:00Z"), // 10/17(토) 0시
      end: new Date("2026-10-18T15:00:00Z"),
    });
  });

  test("토요일: 이번 주말 = 오늘(토)과 내일(일)", () => {
    const saturday = new Date("2026-10-17T03:00:00Z"); // 10/17(토) 12:00 한국
    expect(dateFilterRange("weekend", saturday)).toEqual({
      start: new Date("2026-10-16T15:00:00Z"),
      end: new Date("2026-10-18T15:00:00Z"),
    });
    expect(iso(dateFilterRange("week", saturday).end)).toBe("2026-10-18T15:00:00.000Z");
  });

  test("일요일(UTC로는 토요일 밤): 오늘·이번 주·이번 주말 모두 오늘 하루", () => {
    const sunday = new Date("2026-10-17T15:30:00Z"); // 10/18(일) 0:30 한국
    const today = { start: new Date("2026-10-17T15:00:00Z"), end: new Date("2026-10-18T15:00:00Z") };
    expect(dateFilterRange("today", sunday)).toEqual(today);
    expect(dateFilterRange("week", sunday)).toEqual(today);
    expect(dateFilterRange("weekend", sunday)).toEqual(today);
  });

  test("월요일: 이번 주 = 월~일 7일, 이번 주말 = 토요일부터", () => {
    const monday = new Date("2026-10-18T16:00:00Z"); // 10/19(월) 1:00 한국
    expect(dateFilterRange("week", monday)).toEqual({
      start: new Date("2026-10-18T15:00:00Z"),
      end: new Date("2026-10-25T15:00:00Z"),
    });
    expect(iso(dateFilterRange("weekend", monday).start)).toBe("2026-10-23T15:00:00.000Z"); // 10/24(토)
  });
});

const CATALOG: FilterCatalog = {
  categories: [
    { slug: "learning", name: "배움·자기계발", isParty: false },
    { slug: "hobby", name: "취미", isParty: false },
    { slug: "party", name: "파티·사교", isParty: true },
  ],
  branches: [{ id: 2, name: "홍대점", sido: "서울특별시", sigungu: "마포구" }],
  regions: [
    { code: "11440", sido: "서울특별시", sigungu: "마포구" },
    { code: "11680", sido: "서울특별시", sigungu: "강남구" },
    { code: "26350", sido: "부산광역시", sigungu: "해운대구" },
  ],
};

test.describe("MS6 필터 주소와 거르기 규칙", () => {
  test("주소 값: 아는 값만 받고, 카테고리는 정해진 순서, branch가 region보다 먼저, 파티·사교를 고르면 숨기기 꺼짐", () => {
    expect(
      parseExploreFilter(
        { category: "party,learning,unknown", date: "week", branch: "9", region: "11440", hide_party: "1" },
        CATALOG,
      ),
    ).toEqual({ categories: ["learning", "party"], date: "week", place: { kind: "region", code: "11440" }, hideParty: false });
    expect(parseExploreFilter({ branch: "2", region: "11440", date: "tomorrow", hide_party: "1" }, CATALOG)).toEqual({
      categories: [],
      date: null,
      place: { kind: "branch", branchId: 2 },
      hideParty: true,
    });
    expect(parseExploreFilter({ branch: "all" }, CATALOG).place).toEqual({ kind: "branch", branchId: "all" });
    expect(parseExploreFilter({ region: "11" }, CATALOG).place).toEqual({ kind: "region", code: "11" });
    expect(parseExploreFilter({ region: "99" }, CATALOG).place).toBeNull();
    expect(parseExploreFilter({ region: "1144" }, CATALOG).place).toBeNull();

    const filter = parseExploreFilter({ category: "hobby,learning", date: "today", region: "11", hide_party: "1" }, CATALOG);
    expect(exploreSearch(filter)).toBe("?category=learning,hobby&date=today&region=11&hide_party=1");
    // 토글을 켜면 카테고리의 파티·사교만 빠진다
    const withParty = parseExploreFilter({ category: "learning,party" }, CATALOG);
    expect(exploreSearch(withHideParty(withParty, true, CATALOG))).toBe("?category=learning&hide_party=1");
  });

  test("거르기: 지역은 그 지역의 스터디지점과 외부 장소 모두, 스터디지점은 지점만, 숨기기는 파티·사교만 뺀다", () => {
    const now = new Date("2026-10-14T06:00:00Z");
    const base = { category_is_party: false, starts_at: "2026-10-14T10:00:00Z" };
    const items: (FilterableSocialing & { key: string })[] = [
      { key: "hongdae", ...base, category_slug: "learning", venue_type: "branch", venue_id: 2, region_sido: "서울특별시", region_sigungu: "마포구" },
      { key: "mapo-cafe", ...base, category_slug: "hobby", venue_type: "external", venue_id: 5, region_sido: "서울특별시", region_sigungu: "마포구" },
      { key: "gangnam-lounge", ...base, category_slug: "learning", venue_type: "external", venue_id: 6, region_sido: "서울특별시", region_sigungu: "강남구" },
      { key: "party", category_is_party: true, starts_at: "2026-10-17T10:00:00Z", category_slug: "party", venue_type: "external", venue_id: 7, region_sido: "부산광역시", region_sigungu: "해운대구" },
    ];
    const keys = (params: Record<string, string>) =>
      filterSocialings(items, parseExploreFilter(params, CATALOG), CATALOG, now).map((s) => s.key);

    expect(keys({ region: "11440" })).toEqual(["hongdae", "mapo-cafe"]);
    expect(keys({ region: "11" })).toEqual(["hongdae", "mapo-cafe", "gangnam-lounge"]);
    expect(keys({ branch: "2" })).toEqual(["hongdae"]);
    expect(keys({ branch: "all" })).toEqual(["hongdae"]);
    expect(keys({ hide_party: "1" })).toEqual(["hongdae", "mapo-cafe", "gangnam-lounge"]);
    expect(keys({ category: "learning,party" })).toEqual(["hongdae", "gangnam-lounge", "party"]);
    expect(keys({ date: "today" })).toEqual(["hongdae", "mapo-cafe", "gangnam-lounge"]);
    expect(keys({ date: "weekend" })).toEqual(["party"]);
    expect(keys({ date: "weekend", hide_party: "1" })).toEqual([]);
  });
});

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const toggle = (page: Page) => page.getByRole("switch", { name: "파티·사교 숨기기" });

test.describe("MS6 탐색 화면", () => {
  test("P01-03·E15: 파티·사교 숨기기 기본 꺼짐 → 켜면 파티·사교가 빠지고 주소에 남음 → 아래 탭 탐색은 처음 상태", async ({
    page,
  }) => {
    await page.goto("/explore");
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    await expect(cards(page).filter({ hasText: "파티·사교" }).first()).toBeVisible();

    await toggle(page).click();
    await expect(page).toHaveURL("/explore?hide_party=1");
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
    await expect(cards(page).first()).toBeVisible();
    await expect(cards(page).filter({ hasText: "파티·사교" })).toHaveCount(0);
    await expectNoHorizontalScroll(page);

    // 새로 고쳐도 그대로 (주소에 있음)
    await page.reload();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");

    // E15: 아래 탭으로 탐색에 오면 처음 상태
    await page.getByRole("navigation").getByRole("link", { name: "탐색" }).click();
    await expect(page).toHaveURL("/explore");
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    await expect(cards(page).filter({ hasText: "파티·사교" }).first()).toBeVisible();
  });

  test("홈 바로가기: 카테고리 '취미' → 취미 소셜링만, 스터디지점 '강남점' → 강남점 소셜링만", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "카테고리" }).getByRole("link", { name: "취미" }).click();
    await expect(page).toHaveURL("/explore?category=hobby");
    await expect(cards(page).first()).toBeVisible();
    for (const text of await cards(page).allTextContents()) expect(text).toContain("취미");

    await page.goto("/");
    await page.getByRole("region", { name: "스터디지점에서 찾기" }).getByRole("link", { name: /강남점/ }).click();
    await expect(page).toHaveURL(/\/explore\?branch=\d+$/);
    await expect(cards(page).first()).toBeVisible();
    for (const text of await cards(page).allTextContents()) expect(text).toContain("강남점");
  });

  test("지역 마포구: 홍대점(스터디지점)과 마포구 외부 장소 소셜링이 함께 나온다", async ({ page }) => {
    await page.goto("/explore?region=11440");
    await expect(cards(page).first()).toBeVisible();
    const texts = await cards(page).allTextContents();
    for (const text of texts) expect(text.includes("홍대점") || text.includes("마포구")).toBe(true);
    expect(texts.some((text) => text.includes("홍대점"))).toBe(true);
    expect(texts.some((text) => text.includes("마포구"))).toBe(true);
  });

  test("P01-05: 조건에 맞는 소셜링이 없으면 '조건에 맞는 소셜링이 없어요' + 필터 초기화 → 처음 목록", async ({ page }) => {
    // 시드의 파티·사교 소셜링은 모두 외부 장소라 스터디지점 전체와 겹치지 않는다
    await page.goto("/explore?category=party&branch=all");
    await expect(page.getByText("조건에 맞는 소셜링이 없어요")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await page.getByRole("link", { name: "필터 초기화" }).click();
    await expect(page).toHaveURL("/explore");
    await expect(cards(page).first()).toBeVisible();
    await expect(page.getByText(/^소셜링 \d+개$/)).toBeVisible();
  });

  test("날짜 '오늘': 보이는 카드는 모두 오늘(한국 시간) 소셜링이고, 없으면 조건에 맞는 소셜링이 없다고 보인다", async ({
    page,
  }) => {
    await page.goto("/explore?date=today");
    const today = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })
      .formatToParts(new Date())
      .filter((p) => p.type === "month" || p.type === "day")
      .map((p) => p.value)
      .join("/");
    await expect(cards(page).first().or(page.getByText("조건에 맞는 소셜링이 없어요"))).toBeVisible();
    for (const text of await cards(page).allTextContents()) expect(text).toContain(`${today}(`);
  });
});
