import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  addReview,
  applicationsOf,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  titleOf,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS6 상세 호스트 기록 P03 (spec M5, 6장, 5장 Q3, 7장 3·9단계, 8.6 · DESIGN host-stats · screen-cases P03-01·04~07)
// 시드 호스트는 다른 테스트가 잠깐 만드는 소셜링 때문에 전체 E2E 도중 숫자가 바뀐다. 그래서 테스트마다 전용 호스트 계정을
// 가입시키고 그 계정의 [E2E] 소셜링으로 기록을 만든다. 끝에 소셜링(신청·후기 포함)과 계정을 지운다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

async function newHost(request: APIRequestContext, label: string) {
  const host = await createTestUser(request, label);
  createdUsers.push(host);
  return host;
}

async function fixture(host: TestUser, options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host, ...options });
  createdSocialings.push(id);
  return id;
}

// 종료: 어제 열림
const COMPLETED: Partial<FixtureOptions> = { status: "completed", deadlineInHours: -26, startsInHours: -25 };

/** 상세의 "호스트" 묶음 */
const hostSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 3, name: "호스트" }) });
const cell = (page: Page, label: string) => hostSection(page).locator("dl > div").filter({ hasText: label });
const CRITERIA = "최근 6개월 기록 · 별점이나 점수로 합치지 않아요";

test.describe("MS6 상세 호스트 기록", () => {
  test("P03-01: 기준 문구 + 열린 소셜링 · 호스트 취소 · 소개 일치(응답 수) · 후기 네 칸, 점수 하나로 합치지 않는다", async ({
    page,
    request,
  }) => {
    const host = await newHost(request, "stats-normal");
    const [opened, , , canceled, open] = await Promise.all([
      fixture(host, { ...COMPLETED, capacity: 6, accepted: ["A", "P1", "P2", "P3", "P4"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { status: "canceled", joinType: "approval" }),
      fixture(host, { capacity: 4 }),
    ]);
    await Promise.all([
      addApplication(canceled, "P1", "pending"),
      addReview(opened, "A", { checks: [true, false, true] }),
      addReview(opened, "P1", { checks: [true, false, true] }),
      addReview(opened, "P2", { checks: [true, false, true] }),
      addReview(opened, "P3", { checks: [true, false, true] }),
      addReview(opened, "P4", { checks: [true, true, true] }),
    ]);

    await page.goto(`/socialings/${open}`);
    await expect(hostSection(page)).toContainText(host.nickname);
    await expect(hostSection(page).getByText(CRITERIA)).toBeVisible();
    await expect(cell(page, "열린 소셜링")).toContainText("3회");
    await expect(cell(page, "호스트 취소")).toContainText("1회");
    await expect(cell(page, "소개 일치")).toContainText("80%");
    await expect(cell(page, "소개 일치")).toContainText("응답 5건");
    await expect(cell(page, "후기")).toContainText("5개");
    await expect(hostSection(page).getByText("새 호스트", { exact: false })).toHaveCount(0);
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await expectNoHorizontalScroll(page);
  });

  test("P03-04: 열린 소셜링 3회 미만이면 숫자 대신 '새 호스트 · 기록이 쌓이면 숫자로 보여 줘요'", async ({
    page,
    request,
  }) => {
    const host = await newHost(request, "stats-new");
    const [, , open] = await Promise.all([
      fixture(host, { ...COMPLETED, accepted: ["P1"] }),
      fixture(host, { ...COMPLETED, accepted: ["P2"] }),
      fixture(host),
    ]);
    await page.goto(`/socialings/${open}`);
    await expect(hostSection(page).getByText("새 호스트 · 기록이 쌓이면 숫자로 보여 줘요")).toBeVisible();
    await expect(hostSection(page).getByText(CRITERIA)).toBeVisible();
    await expect(hostSection(page).locator("dl")).toHaveCount(0);
  });

  test("P03-05·06: 기록 숫자는 보이고, 응답 5건 미만이면 소개 일치 칸만 '응답 5건 이상부터 보여요'", async ({
    page,
    request,
  }) => {
    const host = await newHost(request, "stats-ratio");
    const [opened, , , open] = await Promise.all([
      fixture(host, { ...COMPLETED, capacity: 4, accepted: ["A", "P1", "P2", "P3"] }),
      fixture(host, { ...COMPLETED, accepted: ["P4"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host),
    ]);
    await Promise.all(
      (["A", "P1", "P2", "P3"] as const).map((user) => addReview(opened, user, { checks: [true, false, true] })),
    );
    await page.goto(`/socialings/${open}`);
    await expect(cell(page, "열린 소셜링")).toContainText("3회");
    await expect(cell(page, "호스트 취소")).toContainText("0회");
    await expect(cell(page, "소개 일치")).toContainText("응답 5건 이상부터 보여요");
    await expect(cell(page, "소개 일치")).not.toContainText("%");
    await expect(cell(page, "후기")).toContainText("4개");
  });

  test("P03-07·Q3: 호스트 기록만 실패해도 그 칸만 '기록을 불러오지 못했어요', 상세가 보이고 신청이 된다", async ({
    page,
    request,
  }) => {
    const host = await newHost(request, "stats-failed");
    const id = await fixture(host, { capacity: 4 });
    const title = await titleOf(id);

    // 화면 상태 흉내: 호스트 기록만 실패
    await page.goto(`/socialings/${id}?_state=partial`);
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    await expect(hostSection(page).getByRole("alert")).toContainText("기록을 불러오지 못했어요");
    await expect(hostSection(page).getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(hostSection(page).locator("dl")).toHaveCount(0);

    // 비로그인 신청하기 → 로그인 → 상세로 돌아옴. 복귀 주소에는 경로만 담겨 흉내 값이 빠지니 다시 켜고 신청
    const bar = page.getByRole("region", { name: "신청" });
    await bar.getByRole("link", { name: "신청하기" }).click();
    await submitLogin(page, "A");
    await expect(page).toHaveURL(`/socialings/${id}`);
    await page.goto(`/socialings/${id}?_state=partial`);
    await expect(hostSection(page).getByRole("alert")).toContainText("기록을 불러오지 못했어요");
    await bar.getByRole("button", { name: "신청하기" }).click();
    const sheet = page.getByRole("dialog", { name: "신청할까요?" });
    await sheet.getByRole("button", { name: "신청하기" }).click();
    await expect(sheet).toHaveCount(0);
    await expect(bar.getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(hostSection(page).getByRole("alert")).toContainText("기록을 불러오지 못했어요");
    expect(await applicationsOf(id)).toEqual([expect.objectContaining({ status: "accepted" })]);

    // 다시 시도: 흉내를 빼면 기록이 보인다
    await page.goto(`/socialings/${id}`);
    await expect(hostSection(page).getByText("새 호스트 · 기록이 쌓이면 숫자로 보여 줘요")).toBeVisible();
  });

  test("9단계: A가 후기를 올리면 인증 후기 → 소셜링 제목 → 상세 호스트 기록의 후기 수가 1 늘어난다", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    const host = await newHost(request, "stats-step9");
    // X: 종료, A 참여 확정, 아직 후기 없음. 열린 소셜링 3회라 숫자로 보인다
    const [x] = await Promise.all([
      fixture(host, { ...COMPLETED, accepted: ["A"] }),
      fixture(host, { ...COMPLETED, accepted: ["P1"] }),
      fixture(host, { ...COMPLETED, accepted: ["P2"] }),
    ]);
    const title = await titleOf(x);

    await page.goto(`/socialings/${x}`);
    await expect(cell(page, "후기")).toContainText("0개");

    await page.goto(`/login?next=${encodeURIComponent(`/socialings/${x}/review`)}`);
    await submitLogin(page, "A");
    await expect(page).toHaveURL(`/socialings/${x}/review`);
    await page.getByRole("textbox", { name: "후기" }).fill("소개에 적힌 대로 진행돼서 편하게 참여했어요.");
    await page.getByRole("group", { name: /참가자 구성/ }).getByText("예", { exact: true }).click();
    await page.getByRole("group", { name: /금액 외에 돈/ }).getByText("아니오", { exact: true }).click();
    await page.getByRole("group", { name: /진행 내용/ }).getByText("예", { exact: true }).click();
    await page.getByRole("button", { name: "후기 올리기" }).click();

    await expect(page).toHaveURL("/reviews");
    const mine = page.getByRole("article", { name: "서윤님의 후기" }).filter({ hasText: title });
    await mine.getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(`/socialings/${x}`);
    await expect(cell(page, "후기")).toContainText("1개");
    await expect(cell(page, "소개 일치")).toContainText("응답 5건 이상부터 보여요");
  });
});
