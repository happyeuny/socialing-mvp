import { expect, test, type Page } from "@playwright/test";
import {
  EMPTY_FILTER,
  exploreSearch,
  filterChipValues,
  filterSocialings,
  hasAnyFilter,
  parseExploreFilter,
  withHideParty,
  type FilterCatalog,
  type FilterableSocialing,
} from "../../lib/explore-filter";
import { expectNoHorizontalScroll } from "./helpers/auth";

// MS12 U2 술 없는 소셜링만 보기 (spec M3, 7장 시드 조건, 8.2 P01·O01, 8.9 P01 · screen-cases P01-02, O01 · 기능 기획 02 6장)
// 주소 `no_alcohol=1`. "파티·사교 숨기기"와 따로 움직이고, 카테고리에서 파티·사교를 골라도 꺼지지 않는다.
// 화면은 시드로 본다: 술 있는 소셜링은 파티·사교 둘("보드게임과 와인 한 잔", 호스트 취소 "수제 맥주 펍 투어")과
// MS12에 더한 배움 하나("퇴근 후 영어 스몰토크: 맥주 한 잔과 함께")라, 파티·사교를 숨겨도 배움 술 자리는 남는다.

const LEARNING_DRINKS = "퇴근 후 영어 스몰토크: 맥주 한 잔과 함께";
const PARTY_DRINKS = ["보드게임과 와인 한 잔", "수제 맥주 펍 투어"];

const CATALOG: FilterCatalog = {
  categories: [
    { slug: "learning", name: "배움·자기계발", isParty: false },
    { slug: "party", name: "파티·사교", isParty: true },
  ],
  branches: [{ id: 1, name: "강남점", sido: "서울특별시", sigungu: "강남구" }],
  regions: [{ code: "11680", sido: "서울특별시", sigungu: "강남구" }],
};

test.describe("MS12 술 없음 거르기 계산", () => {
  test("주소: no_alcohol=1만 받고, 쓸 때는 참가비 다음 · 숨기기 앞, 칩 값은 '술 없음'", () => {
    expect(parseExploreFilter({ no_alcohol: "1" }, CATALOG).noAlcohol).toBe(true);
    expect(parseExploreFilter({ no_alcohol: "true" }, CATALOG).noAlcohol).toBe(false);
    expect(parseExploreFilter({}, CATALOG)).toEqual(EMPTY_FILTER);

    const filter = parseExploreFilter({ hide_party: "1", no_alcohol: "1", fee: "upto10k", category: "learning" }, CATALOG);
    expect(exploreSearch(filter)).toBe("?category=learning&fee=upto10k&no_alcohol=1&hide_party=1");
    expect(hasAnyFilter({ ...EMPTY_FILTER, noAlcohol: true })).toBe(true);
    expect(filterChipValues({ ...EMPTY_FILTER, noAlcohol: true }, CATALOG).alcohol).toBe("술 없음");
    expect(filterChipValues(EMPTY_FILTER, CATALOG).alcohol).toBeNull();
  });

  test("파티·사교와 따로: 파티·사교를 골라도 꺼지지 않고, 숨기기를 켜도 그대로", () => {
    const withParty = parseExploreFilter({ category: "party", no_alcohol: "1", hide_party: "1" }, CATALOG);
    // 파티·사교를 고르면 숨기기만 꺼진다 (MS6 규칙), 술 없음은 남는다
    expect(withParty).toMatchObject({ categories: ["party"], noAlcohol: true, hideParty: false });
    expect(withHideParty(withParty, true, CATALOG)).toMatchObject({ categories: [], noAlcohol: true, hideParty: true });
  });

  test("거르기: 술 없음은 술 있는 소셜링만 빼고, 숨기기는 파티·사교만 뺀다. 둘 다 켜면 둘 다", () => {
    const now = new Date("2026-10-14T06:00:00Z");
    const base = {
      venue_type: "branch" as const,
      venue_id: 1,
      region_sido: "서울특별시",
      region_sigungu: "강남구",
      starts_at: "2026-10-15T10:00:00Z",
      fee: 15_000,
    };
    const items: (FilterableSocialing & { key: string })[] = [
      { key: "learning", ...base, category_slug: "learning", category_is_party: false, has_alcohol: false },
      { key: "learning-drinks", ...base, category_slug: "learning", category_is_party: false, has_alcohol: true },
      { key: "party-drinks", ...base, category_slug: "party", category_is_party: true, has_alcohol: true },
      { key: "party", ...base, category_slug: "party", category_is_party: true, has_alcohol: false },
    ];
    const keys = (params: Record<string, string>) =>
      filterSocialings(items, parseExploreFilter(params, CATALOG), CATALOG, now).map((s) => s.key);

    expect(keys({})).toEqual(["learning", "learning-drinks", "party-drinks", "party"]);
    expect(keys({ no_alcohol: "1" })).toEqual(["learning", "party"]);
    expect(keys({ hide_party: "1" })).toEqual(["learning", "learning-drinks"]);
    expect(keys({ no_alcohol: "1", hide_party: "1" })).toEqual(["learning"]);
    expect(keys({ no_alcohol: "1", category: "party" })).toEqual(["party"]);
  });
});

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const card = (page: Page, title: string) => cards(page).filter({ hasText: title });
const toggle = (page: Page) => page.getByRole("switch", { name: "파티·사교 숨기기" });
const chips = (page: Page) => page.getByRole("group", { name: "필터" });
const sheet = (page: Page) => page.getByRole("dialog", { name: "필터" });
const alcoholGroup = (page: Page) => sheet(page).getByRole("radiogroup", { name: "술 여부" });
const showButton = (page: Page) => sheet(page).getByRole("button", { name: /^소셜링 \d+개 보기$/ });

async function expectNoDrinks(page: Page) {
  for (const text of await cards(page).allTextContents()) {
    expect(text).toContain("술 없음");
    expect(text).not.toContain("술 있음");
  }
}

test.describe("MS12 술 없음 화면 (P01·O01)", () => {
  test("술 여부 칩 → 시트가 술 여부 묶음으로 열림 → 술 없음 → 칩 값·주소, 술 자리 셋이 빠짐 → 상세 갔다 뒤로 와도 그대로 → 초기화", async ({
    page,
  }) => {
    await page.goto("/explore");
    await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리", "참가비", "술 여부"]);
    await expect(card(page, LEARNING_DRINKS)).toContainText("배움·자기계발 · 술 있음");
    for (const title of PARTY_DRINKS) await expect(card(page, title)).toBeVisible();

    // 칩에서 열면 술 여부 묶음이 보이고 "전체"가 골라져 있다 (날짜와 같은 회색 틀 두 칸)
    await chips(page).getByRole("button", { name: "술 여부" }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(alcoholGroup(page).getByRole("radio")).toHaveCount(2);
    await expect(alcoholGroup(page).getByRole("radio", { name: "전체" })).toBeChecked();
    await expect(alcoholGroup(page)).toBeInViewport();

    await alcoholGroup(page).getByText("술 없음").click();
    await expect(alcoholGroup(page).getByRole("radio", { name: "술 없음" })).toBeChecked();
    await showButton(page).click();

    await expect(sheet(page)).toHaveCount(0);
    await expect(page).toHaveURL("/explore?no_alcohol=1");
    await expect(chips(page).getByRole("button", { name: "술 여부 술 없음" })).toBeVisible();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    await expect(cards(page).first()).toBeVisible();
    await expect(card(page, LEARNING_DRINKS)).toHaveCount(0);
    for (const title of PARTY_DRINKS) await expect(card(page, title)).toHaveCount(0);
    await expectNoDrinks(page);

    // 상세 → 뒤로 → 칩 그대로 (E14)
    await cards(page).first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/explore?no_alcohol=1");
    await expect(chips(page).getByRole("button", { name: "술 여부 술 없음" })).toBeVisible();

    // 시트 초기화는 술 여부도 지운다
    await chips(page).getByRole("button", { name: "전체 필터" }).click();
    await expect(alcoholGroup(page).getByRole("radio", { name: "술 없음" })).toBeChecked();
    await sheet(page).getByRole("button", { name: "초기화" }).click();
    await expect(alcoholGroup(page).getByRole("radio", { name: "전체" })).toBeChecked();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore");
    await expect(card(page, LEARNING_DRINKS)).toBeVisible();
  });

  test("파티·사교 숨기기와 따로: 숨기기만 켜면 배움 술 자리는 남고, 술 없음까지 고르면 빠진다", async ({ page }) => {
    await page.goto("/explore");
    await toggle(page).click();
    await expect(page).toHaveURL("/explore?hide_party=1");
    await expect(card(page, LEARNING_DRINKS)).toBeVisible();
    for (const title of PARTY_DRINKS) await expect(card(page, title)).toHaveCount(0);

    await chips(page).getByRole("button", { name: "술 여부" }).click();
    await alcoholGroup(page).getByText("술 없음").click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore?no_alcohol=1&hide_party=1");
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
    await expect(card(page, LEARNING_DRINKS)).toHaveCount(0);
    await expectNoDrinks(page);

    // 토글을 끄면 술 없음만 남는다
    await toggle(page).click();
    await expect(page).toHaveURL("/explore?no_alcohol=1");
    await expect(chips(page).getByRole("button", { name: "술 여부 술 없음" })).toBeVisible();
  });

  test("카테고리 파티·사교 + 술 없음: 자동으로 꺼지지 않고 술 없는 파티·사교만, 없으면 조건에 맞는 소셜링이 없다", async ({
    page,
  }) => {
    await page.goto("/explore?category=party&no_alcohol=1");
    await expect(chips(page).getByRole("button", { name: "카테고리 파티·사교" })).toBeVisible();
    await expect(chips(page).getByRole("button", { name: "술 여부 술 없음" })).toBeVisible();
    for (const title of PARTY_DRINKS) await expect(card(page, title)).toHaveCount(0);
    if ((await cards(page).count()) === 0) {
      // 지금 시드에는 술 없는 파티·사교가 없다 → 필터 초기화가 필터와 토글을 모두 지운다
      await expect(page.getByText("조건에 맞는 소셜링이 없어요")).toBeVisible();
      await page.getByRole("link", { name: "필터 초기화" }).click();
      await expect(page).toHaveURL("/explore");
      await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리", "참가비", "술 여부"]);
    } else {
      await expectNoDrinks(page);
    }
  });

  test("390·320px: 술 없음까지 고른 칩 줄과 열린 시트에 가로 스크롤이 없다", async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/explore?category=learning&date=week&region=11&fee=10k-20k&no_alcohol=1&hide_party=1");
      await expect(chips(page).getByRole("button", { name: "술 여부 술 없음" })).toBeAttached();
      await expectNoHorizontalScroll(page);
      await chips(page).getByRole("button", { name: "전체 필터" }).click();
      await expect(alcoholGroup(page).getByRole("radio", { name: "술 없음" })).toBeChecked();
      const overflow = await sheet(page).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expectNoHorizontalScroll(page);
    }
  });
});
