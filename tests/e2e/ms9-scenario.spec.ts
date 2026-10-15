import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { makeJpeg } from "./helpers/photos";
import { createFixtureSocialing, deleteFixtureSocialings, titleOf, type FixtureOptions } from "./helpers/supabase";

// MS9 시연 시나리오 1~9단계를 끊지 않고 잇는다 (spec 5장 Q1, 7장). 두 브라우저: page = A 서윤(처음엔 비로그인), hostPage = B 도현.
// 시드 소셜링은 건드리지 않고 B가 호스트인 [E2E] 소셜링 두 개를 쓴다(시드의 "3분 스피치"·X 자리). 둘 다 강남점(테스트 소셜링 장소).
// B의 후기 수는 다른 테스트가 바꾸지 않는다(다른 테스트의 후기는 모두 호스트 C나 전용 호스트 소셜링). 그래서 9단계는 정확히 1 늘었는지 본다.
// 새 테스트가 B 소셜링에 후기를 쓰면 이 테스트와 겹치지 않게 전용 호스트(createTestUser)를 쓴다. 각 단계의 자세한 경우는 MS2~MS8 테스트.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

const APPROVAL_CRITERIA = "영어로 1분 자기소개를 준비해 주세요.";
const REVIEW_BODY = "소개에 적힌 대로 진행돼서 편하게 참여했어요.";

const detail = (id: number) => `/socialings/${id}`;
const manage = (id: number) => `/socialings/${id}/manage`;
const cards = (page: Page) => page.getByRole("main").getByRole("article");
const cardOf = (page: Page, id: number) => page.locator("article").filter({ has: page.locator(`a[href="${detail(id)}"]`) });
const chips = (page: Page) => page.getByRole("group", { name: "필터" });
const filterSheet = (page: Page) => page.getByRole("dialog", { name: "필터" });
const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const infoRow = (page: Page, label: string) => page.locator("dl > div").filter({ hasText: label });
const hostSection = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 3, name: "호스트" }) });
const hostCell = (page: Page, label: string) => hostSection(page).locator("dl > div").filter({ hasText: label });
const statusRegion = (page: Page) => page.getByRole("region", { name: "소셜링 상태" });
const toast = (page: Page) => page.getByTestId("toast");

/** 상세 호스트 기록의 후기 수 */
async function hostReviewCount(page: Page): Promise<number> {
  await expect(hostCell(page, "후기")).toContainText(/\d+개/);
  const text = (await hostCell(page, "후기").textContent()) ?? "";
  return Number(text.match(/(\d+)개/)![1]);
}

test.describe("MS9 시연 시나리오", () => {
  test("1~9단계: 비로그인 둘러보기·필터·상세 → A 신청 → B 승인·확정 → A 참여 확정 → B가 X 종료 → A 인증 후기 → 인증 후기와 B의 후기 수", async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    // 4~6단계용: 호스트 승인, 모집중, 일시 미래, 승인 기준 / X: 확정, 일시 지남, A 참여 확정
    const [meetup, x] = await Promise.all([
      fixture({ host: "B", joinType: "approval", capacity: 4, staffCount: 1, approvalCriteria: APPROVAL_CRITERIA }),
      fixture({ host: "B", status: "confirmed", deadlineInHours: -30, startsInHours: -24, accepted: ["A"] }),
    ]);
    const [meetupTitle, xTitle] = await Promise.all([titleOf(meetup), titleOf(x)]);

    // 1단계 (비로그인): 홈 → 전체 보기 → 탐색. 카테고리·술 여부, "가까운 일시 순"
    await test.step("1단계: 홈 → 전체 보기 → 탐색", async () => {
      await page.goto("/");
      await page.getByRole("link", { name: "곧 열리는 소셜링 전체 보기" }).click();
      await expect(page).toHaveURL("/explore");
      await expect(page.getByText("가까운 일시 순").first()).toBeVisible();
      await expect(cardOf(page, meetup)).toContainText("배움·자기계발 · 술 없음");
    });

    // 2단계 (비로그인): 파티·사교 숨기기 → 장소 칩 → 강남점 → 적용
    let filteredUrl = "";
    await test.step("2단계: 파티·사교 숨기기 + 스터디지점 강남점", async () => {
      await page.getByRole("switch", { name: "파티·사교 숨기기" }).click();
      await expect(page).toHaveURL("/explore?hide_party=1");
      await chips(page).getByRole("button", { name: "장소" }).click();
      await filterSheet(page).getByText("강남점", { exact: true }).click();
      await filterSheet(page).getByRole("button", { name: /^소셜링 \d+개 보기$/ }).click();
      await expect(page).toHaveURL(/\/explore\?branch=\d+&hide_party=1$/);
      await expect(cardOf(page, meetup)).toBeVisible();
      for (const text of await cards(page).allTextContents()) {
        expect(text).toContain("강남점");
        expect(text).not.toContain("파티·사교");
      }
      filteredUrl = page.url();
    });

    // 3단계 (비로그인): 상세 → 상태·인원·스태프·총 참가비·승인 기준·호스트 기록과 등급(O03) → 뒤로 → 필터 그대로
    let reviewsBefore = 0;
    await test.step("3단계: 상세와 등급 조건, 뒤로 가도 필터 그대로", async () => {
      await cardOf(page, meetup).getByRole("link").first().click();
      await expect(page).toHaveURL(detail(meetup));
      await expect(page.getByRole("heading", { level: 2, name: meetupTitle })).toBeVisible();
      await expect(page.getByRole("main").getByText("모집중").first()).toBeVisible();
      await expect(infoRow(page, "인원")).toContainText("참가자 0/4명 · 스태프 1명");
      await expect(infoRow(page, "총 참가비")).toContainText("무료");
      await expect(page.getByRole("main")).toContainText(APPROVAL_CRITERIA);
      reviewsBefore = await hostReviewCount(page);

      await hostSection(page).getByRole("button", { name: /믿고 가는 호스트/ }).click();
      const trustSheet = page.getByRole("dialog", { name: "등급 조건" });
      await expect(trustSheet.getByRole("listitem")).toHaveCount(3);
      await trustSheet.getByRole("button", { name: "확인" }).click();
      await expect(trustSheet).toHaveCount(0);

      await page.getByRole("button", { name: "뒤로" }).click();
      await expect(page).toHaveURL(filteredUrl);
      await expect(chips(page).getByRole("button", { name: "장소 강남점" })).toBeVisible();
      await expect(page.getByRole("switch", { name: "파티·사교 숨기기" })).toHaveAttribute("aria-checked", "true");
    });

    // 4단계 (A): 신청 → 로그인 → 상세로 돌아와 신청 → 승인 대기
    await test.step("4단계: A가 신청 → 로그인 → 돌아와 신청 → 승인 대기", async () => {
      await cardOf(page, meetup).getByRole("link").first().click();
      await expect(page).toHaveURL(detail(meetup));
      await bar(page).getByRole("link", { name: "신청하기" }).click();
      await submitLogin(page, "A");
      await expect(page).toHaveURL(detail(meetup));
      await bar(page).getByRole("button", { name: "신청하기" }).click();
      const applySheet = page.getByRole("dialog", { name: "신청할까요?" });
      await expect(applySheet).toContainText(APPROVAL_CRITERIA);
      await applySheet.getByRole("button", { name: "신청하기" }).click();
      await expect(applySheet).toHaveCount(0);
      await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    });

    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    try {
      // 5단계 (B): 내 소셜링 → 호스트인 소셜링 → 관리 → A 승인 → 확정(O04)
      await test.step("5단계: B가 관리 화면에서 A를 승인하고 확정", async () => {
        await hostPage.goto(`/login?next=${encodeURIComponent("/me?tab=host")}`);
        await submitLogin(hostPage, "B");
        await expect(hostPage).toHaveURL("/me?tab=host");
        await hostPage.locator(`article:has(a[href="${manage(meetup)}"])`).getByRole("link").first().click();
        await expect(hostPage).toHaveURL(manage(meetup));
        await hostPage
          .getByRole("list", { name: "신청자 목록" })
          .getByRole("listitem")
          .filter({ hasText: "서윤" })
          .getByRole("button", { name: "승인" })
          .click();
        await expect(toast(hostPage)).toHaveText("승인했어요");
        await statusRegion(hostPage).getByRole("button", { name: "확정하기", exact: true }).click();
        await hostPage.getByRole("alertdialog").getByRole("button", { name: "확정하기" }).click();
        await expect(toast(hostPage)).toHaveText("확정했어요");
      });

      // 6단계 (A): 신청한 소셜링에서 참여 확정과 확정 상태
      await test.step("6단계: A의 신청한 소셜링에 확정 · 참여 확정", async () => {
        await page.goto("/me");
        const pills = cardOf(page, meetup).locator("h2").locator("xpath=preceding-sibling::div[1]");
        await expect(pills).toHaveText(/^확정\s*참여 확정$/);
      });

      // 7단계 (B): 일시가 지난 확정 소셜링 X를 내 소셜링 → 관리 → 종료(O04)
      await test.step("7단계: B가 X를 종료", async () => {
        await hostPage.goto("/me?tab=host");
        await hostPage.locator(`article:has(a[href="${manage(x)}"])`).getByRole("link").first().click();
        await expect(hostPage).toHaveURL(manage(x));
        await statusRegion(hostPage).getByRole("button", { name: "종료하기", exact: true }).click();
        await hostPage.getByRole("alertdialog").getByRole("button", { name: "종료하기" }).click();
        await expect(toast(hostPage)).toHaveText("종료했어요 · 참여자가 이제 후기를 쓸 수 있어요");
      });
    } finally {
      await hostContext.close();
    }

    // 8단계 (A): 내 소셜링 X "후기 쓰기" → 사진과 비공개 질문 답 → 올리기
    await test.step("8단계: A가 X에 사진과 답을 넣어 인증 후기", async () => {
      await page.goto("/me");
      await cardOf(page, x).getByRole("link", { name: "후기 쓰기" }).click();
      await expect(page).toHaveURL(`${detail(x)}/review`);
      await page.getByRole("textbox", { name: "후기" }).fill(REVIEW_BODY);
      await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
        name: "photo.jpg",
        mimeType: "image/jpeg",
        buffer: await makeJpeg(page, 800, 600),
      });
      await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });
      await page.getByRole("group", { name: /참가자 구성/ }).getByText("예", { exact: true }).click();
      await page.getByRole("group", { name: /금액 외에 돈/ }).getByText("아니오", { exact: true }).click();
      await page.getByRole("group", { name: /진행 내용/ }).getByText("예", { exact: true }).click();
      await page.getByRole("button", { name: "후기 올리기" }).click();
    });

    // 9단계 (A): 인증 후기에서 방금 쓴 후기 → 소셜링 제목 → 상세 호스트 기록의 후기 수가 1 늘어남
    await test.step("9단계: 인증 후기 → 소셜링 제목 → B의 후기 수 증가", async () => {
      await expect(page).toHaveURL("/reviews");
      await expect(page.getByText("후기를 올렸어요")).toBeVisible();
      const mine = page.getByRole("article", { name: "서윤님의 후기" }).filter({ hasText: xTitle });
      await expect(mine.getByRole("img", { name: "후기 사진" })).toBeVisible();
      await expect(mine).toContainText(REVIEW_BODY);
      await mine.getByRole("link", { name: xTitle }).click();
      await expect(page).toHaveURL(detail(x));
      expect(await hostReviewCount(page)).toBe(reviewsBefore + 1);
      await expect(bar(page).getByText("후기 작성 완료")).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
});
