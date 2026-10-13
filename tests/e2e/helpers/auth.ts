import { expect, type Page } from "@playwright/test";
import { DEMO_USERS, type DemoUserKey } from "../../../scripts/seed-data.mts";

/** 지금 열린 로그인 화면(P04)에서 데모 계정으로 로그인한다 */
export async function submitLogin(page: Page, user: DemoUserKey) {
  await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
  await page.getByLabel("이메일").fill(DEMO_USERS[user].email);
  await page.getByLabel("비밀번호").fill(process.env.DEMO_PASSWORD ?? "");
  await page.getByRole("button", { name: "로그인" }).click();
}

/** 390px에서 가로 스크롤이 없다 (AGENTS.md UI 규칙) */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
