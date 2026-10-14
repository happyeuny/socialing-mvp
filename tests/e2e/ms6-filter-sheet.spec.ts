import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers/auth";

// MS6 필터 칩과 필터 시트 O01 (spec M2, M3, 7장 2·3단계, 8.2, 8.9 · screen-cases P01-02·04, O01 3가지, E14)
// 시드 소셜링으로 본다. 다른 테스트가 잠깐 만드는 [E2E] 소셜링은 모두 강남점이라, 시트 숫자와 목록 숫자를 맞춰 보는 것은
// 그 소셜링이 섞이지 않는 마포구로 한다.

const cards = (page: Page) => page.getByRole("main").getByRole("article");
const toggle = (page: Page) => page.getByRole("switch", { name: "파티·사교 숨기기" });
const chips = (page: Page) => page.getByRole("group", { name: "필터" });
const sheet = (page: Page) => page.getByRole("dialog", { name: "필터" });
const showButton = (page: Page) => sheet(page).getByRole("button", { name: /^소셜링 \d+개 보기$/ });

async function sheetCount(page: Page) {
  const text = (await showButton(page).textContent()) ?? "";
  return Number(text.match(/(\d+)개/)?.[1]);
}

test.describe("MS6 필터 칩과 필터 시트", () => {
  test("2단계·E14: 비로그인으로 숨기기를 켜고 장소 칩 → 강남점 → 적용하면 강남점의 파티·사교 아닌 소셜링만, 상세에 갔다 뒤로 와도 그대로", async ({
    page,
  }) => {
    await page.goto("/explore");
    await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리"]);
    await toggle(page).click();
    await expect(page).toHaveURL("/explore?hide_party=1");

    // 장소 칩 → 시트가 장소 위치로 열린다 (spec 8.9 P01)
    await chips(page).getByRole("button", { name: "장소" }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByRole("radio", { name: "스터디지점" })).toBeChecked();
    await expect(sheet(page).getByText("강남점", { exact: true })).toBeInViewport();
    const before = await sheetCount(page);
    await sheet(page).getByText("강남점", { exact: true }).click();
    await expect(sheet(page).getByRole("radio", { name: /^강남점/ })).toBeChecked();
    await expect.poll(() => sheetCount(page)).toBeLessThan(before);
    await showButton(page).click();

    await expect(sheet(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/explore\?branch=\d+&hide_party=1$/);
    await expect(chips(page).getByRole("button", { name: "장소 강남점" })).toBeVisible();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
    await expect(cards(page).first()).toBeVisible();
    for (const text of await cards(page).allTextContents()) {
      expect(text).toContain("강남점");
      expect(text).not.toContain("파티·사교");
    }
    await expectNoHorizontalScroll(page);

    // 3단계 끝(E14): 카드 → 상세 → 뒤로 → 칩·토글 그대로
    const url = page.url();
    await cards(page).first().getByRole("link").first().click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL(url);
    await expect(chips(page).getByRole("button", { name: "장소 강남점" })).toBeVisible();
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true");
  });

  test("O01 지역 2단계: 지역 → 서울특별시 → 마포구, 시트 숫자와 목록 숫자가 같고 홍대점과 마포구 외부 장소가 함께 나온다", async ({
    page,
  }) => {
    await page.goto("/explore");
    await chips(page).getByRole("button", { name: "장소" }).click();
    await sheet(page).getByText("지역 (시·도 → 구)").click();
    await expect(sheet(page).getByRole("radio", { name: "전국" })).toBeChecked();
    await sheet(page).getByRole("button", { name: "서울특별시" }).click();

    // 구 목록: 맨 위 "‹ 서울특별시"(시·도로 돌아감, 목록을 바꾸면 장소 묶음 맨 위로), "서울특별시 전체", 구 25곳
    await expect(sheet(page).getByRole("button", { name: "서울특별시" })).toBeInViewport();
    await expect(sheet(page).getByRole("radio")).toHaveCount(4 + 2 + 1 + 25); // 날짜 4칸 + 장소 갈래 2칸 + 서울특별시 전체 + 구
    await sheet(page).getByText("마포구", { exact: true }).click();
    await expect(sheet(page).getByRole("radio", { name: "마포구" })).toBeChecked();
    const count = await sheetCount(page);
    await showButton(page).click();

    await expect(page).toHaveURL("/explore?region=11440");
    await expect(chips(page).getByRole("button", { name: "장소 마포구" })).toBeVisible();
    await expect(page.getByText(`소셜링 ${count}개`, { exact: true })).toBeVisible();
    await expect(cards(page)).toHaveCount(count);
    const texts = await cards(page).allTextContents();
    expect(texts.some((t) => t.includes("홍대점"))).toBe(true);
    expect(texts.some((t) => t.includes("마포구"))).toBe(true);

    // 다시 열면 지역 갈래의 서울특별시 구 목록에 마포구가 골라져 있다 → 시·도로 돌아가 서울특별시 전체
    await chips(page).getByRole("button", { name: "장소 마포구" }).click();
    await expect(sheet(page).getByRole("radio", { name: "마포구" })).toBeChecked();
    await sheet(page).getByRole("button", { name: "서울특별시" }).click();
    await expect(sheet(page).getByText("전국", { exact: true })).toBeInViewport();
    await expect(sheet(page).getByRole("button", { name: /^서울특별시\s*마포구$/ })).toBeVisible();
    await sheet(page).getByRole("button", { name: /^서울특별시/ }).click();
    await sheet(page).getByText("서울특별시 전체").click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore?region=11");
    await expect(chips(page).getByRole("button", { name: "장소 서울 전체" })).toBeVisible();

    // 전국 = 장소만 지움
    await chips(page).getByRole("button", { name: "장소 서울 전체" }).click();
    await sheet(page).getByRole("button", { name: /서울특별시/ }).first().click(); // 구 목록 → 뒤로
    await sheet(page).getByText("전국", { exact: true }).click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore");
    await expect(chips(page).getByRole("button", { name: "장소", exact: true })).toBeVisible();
  });

  test("P01-04: 숨기기를 켠 채 카테고리 칩에서 파티·사교를 고르고 적용하면 토글이 꺼진다. 여러 개면 칩에 '외 N'", async ({
    page,
  }) => {
    await page.goto("/explore?hide_party=1");
    await chips(page).getByRole("button", { name: "카테고리" }).click();
    await expect(sheet(page).getByText("배움·자기계발", { exact: true })).toBeInViewport();
    await sheet(page).getByText("파티·사교", { exact: true }).click();
    await expect(sheet(page).getByRole("checkbox", { name: "파티·사교" })).toBeChecked();
    await showButton(page).click();

    await expect(page).toHaveURL("/explore?category=party");
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false");
    await expect(chips(page).getByRole("button", { name: "카테고리 파티·사교" })).toBeVisible();
    await expect(cards(page).first()).toBeVisible();
    for (const text of await cards(page).allTextContents()) expect(text).toContain("파티·사교");

    // 하나 더 고르면 카테고리 순서대로 "배움·자기계발 외 1"
    await chips(page).getByRole("button", { name: "카테고리 파티·사교" }).click();
    await sheet(page).getByText("배움·자기계발", { exact: true }).click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore?category=learning,party");
    await expect(chips(page).getByRole("button", { name: "카테고리 배움·자기계발 외 1" })).toBeVisible();
  });

  test("P01-02·O01 값을 고른 상태: 날짜 칩 '이번 주', 시트 초기화는 시트의 값만 지우고 적용해야 바뀐다. 닫으면 그대로", async ({
    page,
  }) => {
    await page.goto("/explore?hide_party=1");
    await chips(page).getByRole("button", { name: "날짜" }).click();
    await expect(sheet(page).getByRole("radio", { name: "전체", exact: true })).toBeChecked();
    await sheet(page).getByText("이번 주", { exact: true }).click();
    await sheet(page).getByText("취미", { exact: true }).click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore?category=hobby&date=week&hide_party=1");
    await expect(chips(page).getByRole("button", { name: "날짜 이번 주" })).toBeVisible();
    await expect(chips(page).getByRole("button", { name: "카테고리 취미" })).toBeVisible();

    // 전체 필터 → 고른 값이 보인다 → 초기화 → 시트만 비워짐 → 닫기 → 주소 그대로
    await chips(page).getByRole("button", { name: "전체 필터" }).click();
    await expect(sheet(page).getByRole("radio", { name: "이번 주", exact: true })).toBeChecked();
    await expect(sheet(page).getByRole("checkbox", { name: "취미" })).toBeChecked();
    await sheet(page).getByRole("button", { name: "초기화" }).click();
    await expect(sheet(page).getByRole("radio", { name: "전체", exact: true })).toBeChecked();
    await expect(sheet(page).getByRole("checkbox", { name: "취미" })).not.toBeChecked();
    await sheet(page).getByRole("button", { name: "닫기" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page).toHaveURL("/explore?category=hobby&date=week&hide_party=1");

    // 다시 초기화하고 적용하면 필터만 지워지고 토글은 그대로
    await chips(page).getByRole("button", { name: "전체 필터" }).click();
    await sheet(page).getByRole("button", { name: "초기화" }).click();
    await showButton(page).click();
    await expect(page).toHaveURL("/explore?hide_party=1");
    await expect(chips(page).getByRole("button")).toHaveText(["", "날짜", "장소", "카테고리"]);
  });

  test("390·320px: 칩 줄과 열린 시트에 가로 스크롤이 없다", async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto("/explore?category=learning,hobby&date=weekend&region=11440&hide_party=1");
      await expect(chips(page).getByRole("button", { name: "카테고리 배움·자기계발 외 1" })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await chips(page).getByRole("button", { name: "전체 필터" }).click();
      await expect(sheet(page)).toBeVisible();
      await expect(showButton(page)).toBeInViewport();
      const overflow = await sheet(page).evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expectNoHorizontalScroll(page);
    }
  });
});
