import { expect, type Locator, type Page } from "@playwright/test";
import { DEMO_USERS, type DemoUserKey } from "../../../scripts/seed-data.mts";

/** 지금 열린 로그인 화면(P04)에서 데모 계정(또는 테스트가 가입시킨 계정)으로 로그인한다 */
export async function submitLogin(page: Page, user: DemoUserKey | { email: string; password: string }) {
  await expect(page.getByRole("heading", { level: 1, name: "로그인" })).toBeVisible();
  const { email, password } =
    typeof user === "string" ? { email: DEMO_USERS[user].email, password: process.env.DEMO_PASSWORD ?? "" } : user;
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
}

/** 390px에서 가로 스크롤이 없다 (AGENTS.md UI 규칙) */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/**
 * 띄어쓰기 없는 긴 글도 상자 밖으로 넘치지 않는다: root 안에서 내용이 제 너비를 넘는 요소가 없다.
 * 일부러 가로로 넘기는 스크롤 상자(overflow-x auto·hidden 등)는 뺀다.
 */
export async function expectNoOverflowingContent(root: Locator) {
  const overflowing = await root.evaluate((rootElement) =>
    [rootElement, ...rootElement.querySelectorAll("*")]
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .filter(
        (element) =>
          getComputedStyle(element).overflowX === "visible" &&
          element.clientWidth > 0 &&
          element.scrollWidth > element.clientWidth + 1,
      )
      .map((element) => `<${element.tagName.toLowerCase()} class="${element.className}"> ${element.textContent?.slice(0, 30)}`),
  );
  expect(overflowing, "칸 밖으로 넘친 글").toEqual([]);
}
