import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { createFixtureSocialing, deleteFixtureSocialings } from "./helpers/supabase";

// MS12 SH4a 소셜링 규칙 안내 (spec M4·6장·8.9 P03, DESIGN.md notice-box/caution · screen-cases P03-01 · 시나리오 3단계)
// 상세 맨 아래(아래 고정 영역 바로 위) "신청 전에 확인해 주세요"에 금지 행위 3가지가 늘 펼쳐 보인다.
// 비로그인·호스트 본인·지난 소셜링 모두 같다. 테스트 전용 [E2E] 소셜링을 한꺼번에 만들어 쓴다.

const RULES = [
  "종교 활동이나 영업 권유하기",
  "앱에 적힌 금액 외에 돈을 요구하기",
  "운영 스태프를 참가자인 것처럼 소개하기",
];

const beforeApply = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 3, name: "신청 전에 확인해 주세요" }) });

async function expectRules(page: Page) {
  const section = beforeApply(page);
  await expect(section).toBeVisible();
  await expect(section).toContainText("소셜링 규칙");
  await expect(section).toContainText("호스트와 참가자 모두 아래 행동을 할 수 없어요");
  const items = section.getByRole("listitem");
  await expect(items).toHaveCount(3);
  for (const [index, rule] of RULES.entries()) await expect(items.nth(index)).toHaveText(`•${rule}`);
  // 개인 연락처·SNS 줄은 넣지 않는다 (기능 기획 02 E1)
  await expect(section).not.toContainText("연락처");
}

test.describe("MS12 소셜링 규칙 안내 (SH4a)", () => {
  let ids: number[] = [];
  let upcoming: number;
  let past: number;

  test.beforeAll(async () => {
    [upcoming, past] = await Promise.all([
      createFixtureSocialing({ host: "B", joinType: "approval", approvalCriteria: "영어로 자기소개를 할 수 있는 분" }),
      createFixtureSocialing({ host: "B", status: "completed", deadlineInHours: -48, startsInHours: -24 }),
    ]);
    ids = [upcoming, past];
  });

  test.afterAll(async () => {
    await deleteFixtureSocialings(ids);
  });

  test("3단계·P03-01: 비로그인 상세 맨 아래에 규칙 3가지, 호스트 묶음 다음이고 아래 고정 영역 위", async ({ page }) => {
    await page.goto(`/socialings/${upcoming}`);
    await expectRules(page);

    // 순서: 소개 → 호스트 → 신청 전에 확인해 주세요 (마지막 묶음)
    const headings = page.getByRole("main").getByRole("heading", { level: 3 });
    await expect(headings).toHaveText(["소개", "호스트", "신청 전에 확인해 주세요"]);
    // 아래 고정 영역(신청하기)은 그 바로 뒤
    const apply = page.getByRole("link", { name: "신청하기" });
    await expect(apply).toBeVisible();
    const follows = await beforeApply(page).evaluate(
      (section, link) => !!link && (section.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      await apply.elementHandle(),
    );
    expect(follows, "신청하기가 규칙 묶음 뒤에 온다").toBe(true);

    // 승인 기준(호스트가 쓴 글, 하늘색 info)과 규칙(플랫폼, 주황 caution)이 다른 상자
    await expect(page.getByText("호스트 승인 기준")).toBeVisible();
  });

  test("DESIGN.md notice-box/caution: caution-soft 바탕, 제목 caution 700, 본문 text-primary", async ({ page }) => {
    await page.goto(`/socialings/${upcoming}`);
    const title = beforeApply(page).getByText("소셜링 규칙", { exact: true });
    const box = title.locator("xpath=..");
    await expect(box).toHaveCSS("background-color", "rgb(255, 244, 224)");
    await expect(title).toHaveCSS("color", "rgb(138, 75, 0)");
    await expect(title).toHaveCSS("font-weight", "700");
    await expect(beforeApply(page).getByRole("listitem").first()).toHaveCSS("color", "rgb(17, 24, 39)");
  });

  test("호스트 본인과 지난 소셜링에도 그대로 보인다", async ({ page }) => {
    await page.goto(`/socialings/${past}`);
    await expectRules(page);
    await expect(page.getByText("소셜링 일시가 지났어요")).toBeVisible();

    await page.goto(`/login?next=/socialings/${upcoming}`);
    await submitLogin(page, "B");
    await expect(page).toHaveURL(`/socialings/${upcoming}`);
    await expect(page.getByText("내가 연 소셜링이에요")).toBeVisible();
    await expectRules(page);
  });

  test("390·320px에서 가로 스크롤 없음", async ({ page }) => {
    await page.goto(`/socialings/${upcoming}`);
    await expect(beforeApply(page)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});
