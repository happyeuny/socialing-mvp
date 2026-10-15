import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { apiHeaders, supabaseUrl } from "./helpers/supabase";

// MS9 전체 화면 점검 (spec 5장 Q2, 8.6, 10장 · AGENTS.md UI 규칙 · screen-cases 각 화면의 로딩·오류·빈 상태).
// 화면 13개(P00~P11, P03은 없는 소셜링 포함)를 보통·로딩·오류·빈 결과로 열고 390·320px에서 가로 스크롤이 없는지,
// 정해진 문구와 다음 행동(다시 시도·홈으로, 빈 상태 버튼)이 있는지, "하지 않는 것"에 걸리는 버튼·문구가 없는지 한 번에 본다.
// 화면을 열기만 하고 데이터를 바꾸지 않는다(시드 소셜링의 수정·관리·후기 쓰기 화면도 열기만 함). 자세한 경우는 MS2~MS8 테스트.

const SEED = {
  approval: "영어로 내 일 소개하기: 3분 스피치", // B 호스트, 모집중
  y: "영어 뉴스 한 편 같이 읽기", // B 호스트, 종료, A 참여 확정, 후기 없음
};

/** spec 10장 "하지 않는 것"의 버튼·링크 이름 */
const FORBIDDEN_CONTROL = /찜|좋아요|공유|검색|지도|알림|채팅|메시지|랭킹|포인트|뱃지|인기|추천|별점|다크/;
/** 화면 어디에도 없어야 하는 표현 (AGENTS.md 용어, spec 10장) */
const FORBIDDEN_TEXT = /이성 교류|문토|모임|이벤트|진행 확정|확정 마감|매너 점수|매너 온도/;

type Empty = { title: string; action: string };
type Screen = { id: string; path: string; states: boolean; empty?: Empty };

async function seedId(request: APIRequestContext, title: string): Promise<number> {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialings?select=id&title=eq.${encodeURIComponent(title)}`,
    { headers: apiHeaders() },
  );
  const rows = (await response.json()) as { id: number }[];
  expect(rows, `시드 소셜링 "${title}" (npm run seed)`).toHaveLength(1);
  return rows[0].id;
}

const withState = (path: string, state: string) => `${path}${path.includes("?") ? "&" : "?"}_state=${state}`;

async function loginAs(page: Page, user: "A" | "B") {
  await page.goto("/login");
  await submitLogin(page, user);
  await expect(page).toHaveURL("/");
}

/** 로딩 틀이 사라질 때까지 기다린다 (Suspense로 나눠 그리는 화면) */
async function waitForContent(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

async function expectNoScrollAt390And320(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalScroll(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await expectNoHorizontalScroll(page);
  await page.setViewportSize({ width: 390, height: 844 });
}

async function expectNothingOutOfScope(page: Page, id: string) {
  const names = await page
    .locator("button, a, input, [role=button], [role=link], [role=switch]")
    .evaluateAll((elements) =>
      elements.map((element) => (element.getAttribute("aria-label") ?? element.textContent ?? "").trim()),
    );
  expect(names.filter((name) => FORBIDDEN_CONTROL.test(name)), `${id} 버튼·링크`).toEqual([]);
  await expect(page.getByRole("searchbox"), `${id} 검색창`).toHaveCount(0);
  const text = await page.locator("body").innerText();
  expect(text.match(FORBIDDEN_TEXT)?.[0] ?? null, `${id} 화면 글자`).toBeNull();
}

async function sweep(page: Page, screen: Screen) {
  await test.step(`${screen.id} 보통`, async () => {
    await page.goto(screen.path);
    await waitForContent(page);
    await expect(page.getByText("불러오지 못했어요")).toHaveCount(0);
    await expectNoScrollAt390And320(page);
    await expectNothingOutOfScope(page, screen.id);
  });
  if (!screen.states) return;

  await test.step(`${screen.id} 로딩`, async () => {
    await page.goto(withState(screen.path, "loading"));
    await expect(page.locator('[role="status"][aria-busy="true"]').first()).toBeVisible();
    await expectNoScrollAt390And320(page);
  });

  await test.step(`${screen.id} 오류`, async () => {
    await page.goto(withState(screen.path, "error"));
    const alert = page.getByRole("alert").filter({ hasText: "불러오지 못했어요" });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(alert.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
    await expectNoScrollAt390And320(page);
  });

  if (screen.empty) {
    const { title, action } = screen.empty;
    await test.step(`${screen.id} 빈 결과`, async () => {
      await page.goto(withState(screen.path, "empty"));
      await expect(page.getByText(title, { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: action })).toBeVisible();
      await expectNoScrollAt390And320(page);
    });
  }
}

test.describe("MS9 전체 화면 점검", () => {
  test("비로그인 화면: P00 홈 · P01 탐색 · P02 지난 소셜링 · P03 상세(없는 소셜링 포함) · P04 로그인 · P05 가입 · P10 인증 후기", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const detail = await seedId(request, SEED.approval);
    const screens: Screen[] = [
      { id: "P00", path: "/", states: true, empty: { title: "지금 신청할 수 있는 소셜링이 없어요", action: "지난 소셜링 보기" } },
      { id: "P01", path: "/explore", states: true, empty: { title: "지금 열린 소셜링이 없어요", action: "지난 소셜링 보기" } },
      { id: "P02", path: "/past", states: true, empty: { title: "지난 소셜링이 아직 없어요", action: "탐색으로" } },
      { id: "P03", path: `/socialings/${detail}`, states: true },
      { id: "P04", path: "/login", states: false },
      { id: "P05", path: "/signup", states: false },
      { id: "P10", path: "/reviews", states: true, empty: { title: "아직 후기가 없어요", action: "탐색하기" } },
    ];
    for (const screen of screens) await sweep(page, screen);

    await test.step("P03 없는 소셜링: 찾을 수 없는 소셜링 + 탐색으로 · 홈으로", async () => {
      await page.goto("/socialings/2147483647");
      await expect(page.getByText("찾을 수 없는 소셜링이에요")).toBeVisible();
      await expect(page.getByRole("link", { name: "탐색으로" })).toBeVisible();
      await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
      await expectNoScrollAt390And320(page);
    });
  });

  test("A 서윤 화면: P06 신청한 소셜링 · P09 후기 쓰기", async ({ page, request }) => {
    test.setTimeout(90_000);
    const y = await seedId(request, SEED.y);
    await loginAs(page, "A");
    const screens: Screen[] = [
      { id: "P06 신청한", path: "/me", states: true, empty: { title: "아직 신청한 소셜링이 없어요", action: "탐색하기" } },
      { id: "P09", path: `/socialings/${y}/review`, states: true },
    ];
    for (const screen of screens) await sweep(page, screen);
  });

  test("B 도현 화면: P06 호스트인 소셜링 · P07 등록 · P08 수정 · P11 관리", async ({ page, request }) => {
    test.setTimeout(120_000);
    const id = await seedId(request, SEED.approval);
    await loginAs(page, "B");
    const screens: Screen[] = [
      {
        id: "P06 호스트인",
        path: "/me?tab=host",
        states: true,
        empty: { title: "아직 연 소셜링이 없어요", action: "새 소셜링 만들기" },
      },
      { id: "P07", path: "/socialings/new", states: true },
      { id: "P08", path: `/socialings/${id}/edit`, states: true },
      { id: "P11", path: `/socialings/${id}/manage`, states: true },
    ];
    for (const screen of screens) await sweep(page, screen);
  });
});
