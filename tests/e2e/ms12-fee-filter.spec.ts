import { expect, test, type Page } from "@playwright/test";
import {
  EMPTY_FILTER,
  exploreSearch,
  feeInRange,
  filterChipValues,
  filterSocialings,
  hasAnyFilter,
  parseExploreFilter,
  type FilterCatalog,
  type FilterableSocialing,
} from "../../lib/explore-filter";
import { expectNoHorizontalScroll } from "./helpers/auth";

// MS12 SH1a 참가비 필터 (spec M3, 8.2 P01·O01, 8.9 P01 · screen-cases P01-02, O01 · 기능 기획 02 5장)
// 구간은 겹치지 않는다: 무료 0원 · 1만 원 이하 1~10,000원 · 1만~2만 원 10,001~20,000원 · 2만 원 넘음 20,001원 이상.
// 계산은 함수로, 화면은 시드 소셜링으로 본다. 다른 테스트가 잠깐 만드는 [E2E] 소셜링이 섞일 수 있어
// 개수는 세지 않고 보이는 카드의 참가비가 고른 구간 안인지 본다.

const CATALOG: FilterCatalog = {
  categories: [
    { slug: "learning", name: "배움·자기계발", isParty: false },
    { slug: "party", name: "파티·사교", isParty: true },
  ],
  branches: [{ id: 1, name: "강남점", sido: "서울특별시", sigungu: "강남구" }],
  regions: [{ code: "11680", sido: "서울특별시", sigungu: "강남구" }],
};

test.describe("MS12 참가비 구간 계산", () => {
  test("경계: 0 · 10,000 · 10,001 · 20,000 · 20,001원이 한 구간에만 들어간다", () => {
    const bucketOf = (fee: number) => (["free", "upto10k", "10k-20k", "over20k"] as const).filter((f) => feeInRange(fee, f));
    expect(bucketOf(0)).toEqual(["free"]);
    expect(bucketOf(1)).toEqual(["upto10k"]);
    expect(bucketOf(10_000)).toEqual(["upto10k"]);
    expect(bucketOf(10_001)).toEqual(["10k-20k"]);
    expect(bucketOf(20_000)).toEqual(["10k-20k"]);
    expect(bucketOf(20_001)).toEqual(["over20k"]);
    expect(bucketOf(1_000_000)).toEqual(["over20k"]);
  });

  test("주소: 아는 값만 받고, 쓸 때는 장소 다음 · 숨기기 앞, 칩 값은 구간 이름", () => {
    expect(parseExploreFilter({ fee: "upto10k" }, CATALOG).fee).toBe("upto10k");
    expect(parseExploreFilter({ fee: "cheap" }, CATALOG).fee).toBeNull();
    expect(parseExploreFilter({ fee: ["over20k", "free"] }, CATALOG).fee).toBe("over20k");
    expect(parseExploreFilter({}, CATALOG)).toEqual(EMPTY_FILTER);

    const filter = parseExploreFilter({ hide_party: "1", fee: "10k-20k", branch: "1", category: "learning" }, CATALOG);
    expect(exploreSearch(filter)).toBe("?category=learning&branch=1&fee=10k-20k&hide_party=1");
    expect(hasAnyFilter({ ...EMPTY_FILTER, fee: "free" })).toBe(true);
    expect(filterChipValues({ ...EMPTY_FILTER, fee: "free" }, CATALOG).fee).toBe("무료");
    expect(filterChipValues({ ...EMPTY_FILTER, fee: "over20k" }, CATALOG).fee).toBe("2만 원 넘음");
    expect(filterChipValues(EMPTY_FILTER, CATALOG).fee).toBeNull();
  });

  test("거르기: 참가비 구간과 다른 필터가 함께 걸린다", () => {
    const now = new Date("2026-10-14T06:00:00Z");
    const base = {
      category_slug: "learning",
      category_is_party: false,
      venue_type: "branch" as const,
      venue_id: 1,
      region_sido: "서울특별시",
      region_sigungu: "강남구",
      starts_at: "2026-10-15T10:00:00Z",
      has_alcohol: false,
    };
    const items: (FilterableSocialing & { key: string })[] = [
      { key: "free", ...base, fee: 0 },
      { key: "10000", ...base, fee: 10_000 },
      { key: "10001", ...base, fee: 10_001 },
      { key: "20000", ...base, fee: 20_000 },
      { key: "20001", ...base, fee: 20_001 },
      { key: "party-15000", ...base, category_slug: "party", category_is_party: true, fee: 15_000 },
    ];
    const keys = (params: Record<string, string>) =>
      filterSocialings(items, parseExploreFilter(params, CATALOG), CATALOG, now).map((s) => s.key);

    expect(keys({ fee: "free" })).toEqual(["free"]);
    expect(keys({ fee: "upto10k" })).toEqual(["10000"]);
    expect(keys({ fee: "10k-20k" })).toEqual(["10001", "20000", "party-15000"]);
    expect(keys({ fee: "10k-20k", hide_party: "1" })).toEqual(["10001", "20000"]);
    expect(keys({ fee: "over20k" })).toEqual(["20001"]);
    expect(keys({})).toHaveLength(6);
  });
});

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const chips = (page: Page) => page.getByRole("group", { name: "필터" });
const sheet = (page: Page) => page.getByRole("dialog", { name: "필터" });
const feeGroup = (page: Page) => sheet(page).getByRole("radiogroup", { name: "참가비" });
const showButton = (page: Page) => sheet(page).getByRole("button", { name: /^소셜링 \d+개 보기$/ });

/** 카드 맨 끝의 총 참가비 ("무료" 또는 "15,000원") */
function cardFee(text: string): number {
  const match = text.trim().match(/(무료|([\d,]+)원)$/);
  if (!match) throw new Error(`참가비를 찾지 못함: ${text}`);
  return match[1] === "무료" ? 0 : Number(match[2].replaceAll(",", ""));
}

async function expectCardFees(page: Page, inRange: (fee: number) => boolean) {
  await expect(cards(page).first()).toBeVisible();
  const count = await showListCount(page);
  await expect(cards(page)).toHaveCount(count);
  for (const text of await cards(page).allTextContents()) expect(inRange(cardFee(text)), text).toBe(true);
}

async function showListCount(page: Page) {
  const text = (await page.getByText(/^소셜링 \d+개$/).textContent()) ?? "";
  return Number(text.match(/(\d+)개/)?.[1]);
}

test.describe("MS12 참가비 필터 화면 (P01·O01)", () => {
  test("참가비 칩 → 시트가 참가비 묶음으로 열림 → 1만~2만 원 → 칩 값·주소 → 상세 갔다 뒤로 와도 그대로 → 초기화", async ({
    page,
  }) => {
    await page.goto("/explore");
    await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리", "참가비", "술 여부"]);

    // 칩에서 열면 참가비 묶음이 시트 맨 위에, 다섯 칸 중 "전체"가 골라져 있다 (하나만 고르기)
    await chips(page).getByRole("button", { name: "참가비" }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(feeGroup(page).getByRole("radio")).toHaveCount(5);
    await expect(feeGroup(page)).toHaveText("전체무료1만 원 이하1만~2만 원2만 원 넘음");
    await expect(feeGroup(page).getByRole("radio", { name: "전체" })).toBeChecked();
    await expect(feeGroup(page).getByText("2만 원 넘음")).toBeInViewport();

    await feeGroup(page).getByText("1만~2만 원").click();
    await expect(feeGroup(page).getByRole("radio", { name: "1만~2만 원" })).toBeChecked();
    await expect(feeGroup(page).getByRole("radio", { name: "전체" })).not.toBeChecked();
    await showButton(page).click();

    await expect(sheet(page)).toHaveCount(0);
    await expect(page).toHaveURL("/explore?fee=10k-20k");
    await expect(chips(page).getByRole("button", { name: "참가비 1만~2만 원" })).toBeVisible();
    await expectCardFees(page, (fee) => fee >= 10_001 && fee <= 20_000);

    // 상세 → 뒤로 → 칩 그대로 (E14)
    await cards(page).first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/explore?fee=10k-20k");
    await expect(chips(page).getByRole("button", { name: "참가비 1만~2만 원" })).toBeVisible();

    // 시트 초기화는 참가비도 지운다. 적용하면 주소에서도 빠진다
    await chips(page).getByRole("button", { name: "전체 필터" }).click();
    await expect(feeGroup(page).getByRole("radio", { name: "1만~2만 원" })).toBeChecked();
    await sheet(page).getByRole("button", { name: "초기화" }).click();
    await expect(feeGroup(page).getByRole("radio", { name: "전체" })).toBeChecked();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore");
    await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리", "참가비", "술 여부"]);
  });

  test("주소로 들어온 무료·2만 원 넘음: 카드가 그 구간뿐이고, 모르는 값은 무시한다", async ({ page }) => {
    await page.goto("/explore?fee=free");
    await expect(chips(page).getByRole("button", { name: "참가비 무료" })).toBeVisible();
    await expectCardFees(page, (fee) => fee === 0);

    await page.goto("/explore?fee=over20k");
    await expect(chips(page).getByRole("button", { name: "참가비 2만 원 넘음" })).toBeVisible();
    await expectCardFees(page, (fee) => fee >= 20_001);

    await page.goto("/explore?fee=cheap");
    await expect(chips(page).getByRole("button", { name: "참가비", exact: true })).toBeVisible();
  });

  test("390·320px: 참가비를 고른 칩 줄과 열린 시트에 가로 스크롤이 없다", async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/explore?category=learning&date=week&region=11&fee=upto10k&hide_party=1");
      await expect(chips(page).getByRole("button", { name: "참가비 1만 원 이하" })).toBeAttached();
      await expectNoHorizontalScroll(page);
      await chips(page).getByRole("button", { name: "전체 필터" }).click();
      await expect(feeGroup(page).getByRole("radio", { name: "1만 원 이하" })).toBeChecked();
      const overflow = await sheet(page).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expectNoHorizontalScroll(page);
    }
  });
});
