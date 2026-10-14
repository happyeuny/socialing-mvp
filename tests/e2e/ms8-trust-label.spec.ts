import { expect, test, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers/auth";
import {
  addReview,
  apiHeaders,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS8 등급 라벨과 O03 등급 조건 (spec M4, M5, 6장, 7장 3단계, 8.2 O03 · DESIGN trust-label, bottom-sheet/trust-criteria
// · screen-cases P03-01·04·05·07, O03). 등급 판단은 get_host_record의 is_trusted_host(ms8-trusted-host-fn).
// 시드 B의 열린 소셜링 수는 다른 테스트가 잠깐 종료하는 B 소셜링 때문에 전체 E2E 도중 늘 수 있어, 시드 B는 조건을 채우는지만 보고
// 정확한 값은 전용 호스트 계정으로 본다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

const SEED = {
  B: "영어로 내 일 소개하기: 3분 스피치", // 도현: 등급
  C: "작은 전시 함께 보고 이야기 나누기", // 하린: 새 호스트
  D: "한강 5km 가볍게 달리기", // 준호: 숫자만
};

const COMPLETED: Partial<FixtureOptions> = { status: "completed", deadlineInHours: -26, startsInHours: -25 };

/** 제목 아래 호스트 줄 (h2 제목 바로 다음) */
const hostRow = (page: Page) => page.getByRole("main").locator("section").first();
/** 상세의 "호스트" 묶음 */
const hostSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 3, name: "호스트" }) });
const labelIn = (scope: Locator) => scope.getByRole("button", { name: /믿고 가는 호스트/ });
const sheet = (page: Page) => page.getByRole("dialog", { name: "등급 조건" });
const row = (page: Page, condition: string) => sheet(page).getByRole("listitem").filter({ hasText: condition });

async function seedId(request: APIRequestContext, title: string): Promise<number> {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialings?select=id&title=eq.${encodeURIComponent(title)}`,
    { headers: apiHeaders() },
  );
  const rows = (await response.json()) as { id: number }[];
  expect(rows, `시드 소셜링 "${title}" (npm run seed)`).toHaveLength(1);
  return rows[0].id;
}

/** 호스트 기록이 다 그려질 때까지 기다린다 (라벨은 기록과 함께 따로 붙는다) */
async function waitForHostRecord(page: Page) {
  await expect(hostSection(page).getByText("최근 6개월 기록 · 별점이나 점수로 합치지 않아요")).toBeVisible();
  await expect(hostSection(page).getByRole("status")).toHaveCount(0);
}

test.describe("MS8 등급 라벨과 O03", () => {
  test("3단계·O03: 비로그인 탐색 → 시드 B 소셜링 상세 → 호스트 줄과 호스트 묶음에 라벨 → 등급 조건 3줄 → 확인 → 뒤로 탐색 그대로", async ({
    page,
  }) => {
    await page.goto("/explore?hide_party=1");
    await page.getByRole("main").getByRole("article").filter({ hasText: SEED.B }).getByRole("link").first().click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    await waitForHostRecord(page);

    // 라벨은 두 곳: 제목 아래 호스트 줄("호스트 도현" 옆), 호스트 묶음 닉네임 아래
    await expect(hostRow(page)).toContainText("도현");
    await expect(labelIn(hostRow(page))).toBeVisible();
    await expect(labelIn(hostRow(page))).toHaveText("믿고 가는 호스트 등급 조건 보기");
    await expect(labelIn(hostSection(page))).toBeVisible();
    await expect(page.getByRole("button", { name: /믿고 가는 호스트/ })).toHaveCount(2);

    // 보이는 높이는 24, 누르는 영역은 위아래로 넓혀 44: 라벨 위 8px을 눌러도 열린다
    const box = await labelIn(hostRow(page)).boundingBox();
    expect(box?.height).toBe(24);
    await page.mouse.click(box!.x + box!.width / 2, box!.y - 8);
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page)).toContainText("믿고 가는 호스트");
    await expect(sheet(page)).toContainText("최근 6개월 기록으로 아래 3가지를 모두 채운 호스트예요");
    await expect(sheet(page).getByRole("listitem")).toHaveCount(3);
    // 시드 B는 조건을 채운다 (값은 다른 테스트 때문에 늘 수 있어 조건만 본다)
    const opened = Number((await row(page, "열린 소셜링 5회 이상").textContent())?.match(/(\d+)회$/)?.[1]);
    expect(opened).toBeGreaterThanOrEqual(5);
    await expect(row(page, "호스트 취소 0회")).toHaveText(/호스트 취소 0회0회$/);
    const matchText = (await row(page, "소개 일치 90% 이상").textContent()) ?? "";
    expect(Number(matchText.match(/(\d+)%\(응답/)?.[1])).toBeGreaterThanOrEqual(90);
    expect(Number(matchText.match(/응답 (\d+)건/)?.[1])).toBeGreaterThanOrEqual(5);
    await expect(sheet(page)).toContainText("별점이나 점수가 아니라 공개된 기록으로만 정해요");
    await expectNoHorizontalScroll(page);

    await sheet(page).getByRole("button", { name: "확인" }).click();
    await expect(sheet(page)).toHaveCount(0);

    // 호스트 묶음의 라벨로도 같은 창. 키보드로 열고 Esc로 닫으면 라벨로 돌아온다
    await labelIn(hostSection(page)).focus();
    await page.keyboard.press("Enter");
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByRole("listitem")).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
    await expect(labelIn(hostSection(page))).toBeFocused();

    // 3단계 끝: 뒤로 → 탐색, 토글 그대로
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL("/explore?hide_party=1");
    await expect(page.getByRole("switch", { name: "파티·사교 숨기기" })).toHaveAttribute("aria-checked", "true");
  });

  test("P03-04·05: 조건 미달 호스트에는 라벨이 없다 (시드 C 새 호스트, 시드 D 기록 숫자만)", async ({ page, request }) => {
    await page.goto(`/socialings/${await seedId(request, SEED.C)}`);
    await waitForHostRecord(page);
    await expect(hostSection(page).getByText("새 호스트 · 기록이 쌓이면 숫자로 보여 줘요")).toBeVisible();
    await expect(page.getByRole("button", { name: /믿고 가는 호스트/ })).toHaveCount(0);
    await expect(page.getByText("믿고 가는 호스트")).toHaveCount(0);

    await page.goto(`/socialings/${await seedId(request, SEED.D)}`);
    await waitForHostRecord(page);
    await expect(hostSection(page).locator("dl > div").filter({ hasText: "열린 소셜링" })).toContainText("회");
    await expect(page.getByRole("button", { name: /믿고 가는 호스트/ })).toHaveCount(0);
    await expect(page.getByText("믿고 가는 호스트")).toHaveCount(0);
  });

  test("O03: 이 호스트의 실제 값을 보인다 (전용 호스트: 열린 5회 · 취소 0회 · 응답 5건 모두 일치), 바깥을 눌러도 닫힘, 320px", async ({
    page,
    request,
  }) => {
    const host = await createTestUser(request, "trust-sheet");
    createdUsers.push(host);
    const ids = await Promise.all([
      createFixtureSocialing({ host, ...COMPLETED, capacity: 5, accepted: ["A", "P1", "P2", "P3", "P4"] }),
      createFixtureSocialing({ host, ...COMPLETED, accepted: ["P5"] }),
      createFixtureSocialing({ host, ...COMPLETED, accepted: ["P5"] }),
      createFixtureSocialing({ host, ...COMPLETED, accepted: ["P5"] }),
      createFixtureSocialing({ host, ...COMPLETED, accepted: ["P5"] }),
      createFixtureSocialing({ host }),
    ]);
    createdSocialings.push(...ids);
    await Promise.all(
      (["A", "P1", "P2", "P3", "P4"] as const).map((user) => addReview(ids[0], user, { checks: [true, false, true] })),
    );

    await page.goto(`/socialings/${ids[5]}`);
    await waitForHostRecord(page);
    await expect(hostRow(page)).toContainText(host.nickname);
    await labelIn(hostSection(page)).click();
    await expect(row(page, "열린 소셜링 5회 이상")).toHaveText(/5회$/);
    await expect(row(page, "호스트 취소 0회")).toHaveText(/0회$/);
    await expect(row(page, "소개 일치 90% 이상")).toHaveText(/100%\(응답 5건\)$/);

    // 바깥(뒤 dim)을 누르면 닫힌다
    await page.mouse.click(195, 40);
    await expect(sheet(page)).toHaveCount(0);

    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await labelIn(hostRow(page)).click();
    await expect(sheet(page).getByRole("button", { name: "확인" })).toBeInViewport();
    await expectNoHorizontalScroll(page);
  });

  test("P03-07·Q3: 호스트 기록을 못 읽으면 라벨도 없고 호스트 묶음만 '기록을 불러오지 못했어요'", async ({
    page,
    request,
  }) => {
    await page.goto(`/socialings/${await seedId(request, SEED.B)}?_state=partial`);
    await expect(hostSection(page).getByText("기록을 불러오지 못했어요")).toBeVisible();
    await expect(hostSection(page)).toContainText("도현");
    await expect(page.getByRole("button", { name: /믿고 가는 호스트/ })).toHaveCount(0);
  });
});
