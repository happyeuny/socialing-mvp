import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, expectNoOverflowingContent, submitLogin } from "./helpers/auth";
import {
  createFixtureSocialing,
  deleteFixtureSocialings,
  deleteTestVenues,
  type FixtureOptions,
} from "./helpers/supabase";

// 띄어쓰기 없이 길게 쓴 글이 칸 밖으로 넘치지 않는다 (AGENTS.md UI 규칙 "가로 스크롤 없음", PM이 #77 미리보기에서 발견).
// 호스트가 쓰는 글 칸을 모두 입력 한도까지 띄어쓰기 없이 채운 테스트 전용 [E2E] 소셜링으로 390·320px에서 본다.

const unbroken = (length: number) => "asdf".repeat(Math.ceil(length / 4)).slice(0, length);

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
  await deleteTestVenues();
});

async function longTextSocialing(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({
    host: "B",
    capacity: 4,
    joinType: "approval",
    titleTail: unbroken(35),
    description: unbroken(300),
    approvalCriteria: unbroken(200),
    fee: 15000,
    feeNote: unbroken(100),
    materialUrl: `https://${unbroken(60)}.example.com/${unbroken(200)}`,
    externalPlaceName: `[E2E]${unbroken(35)}`,
    deadlineInHours: 24 * 5,
    ...options,
  });
  created.push(id);
  return id;
}

async function loginAs(page: Page, user: "A" | "B", next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

/** 390px과 320px에서 페이지 가로 스크롤이 없고 root 안의 글이 넘치지 않는다 */
async function expectFits(page: Page, root: Locator) {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflowingContent(root);
    await expectNoHorizontalScroll(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

test("P03·O02 긴 글: 제목·소개·장소·승인 기준 상자·참가비 설명·자료 주소가 칸 안에서 줄바꿈된다 (390·320px)", async ({
  page,
}) => {
  const id = await longTextSocialing();
  await loginAs(page, "A");
  await page.goto(`/socialings/${id}`);
  const main = page.getByRole("main");
  await expect(main.getByText("호스트 승인 기준", { exact: true })).toBeVisible();
  await expectFits(page, main);

  await page.getByRole("region", { name: "신청" }).getByRole("button", { name: "신청하기" }).click();
  const sheet = page.getByRole("dialog", { name: "신청할까요?" });
  await expect(sheet.getByText("호스트 승인 기준", { exact: true })).toBeVisible();
  await expectFits(page, sheet);
  await sheet.getByRole("button", { name: "돌아가기" }).click();
});

test("P11·P06 긴 글: 호스트의 관리 화면과 내 소셜링 호스트 탭 (390·320px)", async ({ page }) => {
  const id = await longTextSocialing();
  await loginAs(page, "B");
  await page.goto(`/socialings/${id}/manage`);
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(unbroken(20)) })).toBeVisible();
  await expectFits(page, page.getByRole("main"));

  await page.goto("/me?tab=host");
  await expect(page.locator(`article:has(a[href="/socialings/${id}/manage"])`)).toBeVisible();
  await expectFits(page, page.getByRole("main"));
});

test("P09 긴 글: 후기 쓰기 화면의 소셜링 요약 (390·320px)", async ({ page }) => {
  const id = await longTextSocialing({ status: "completed", deadlineInHours: -48, startsInHours: -24, accepted: ["A"] });
  await loginAs(page, "A", `/socialings/${id}/review`);
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(unbroken(20)) })).toBeVisible();
  await expectFits(page, page.getByRole("main"));
});
