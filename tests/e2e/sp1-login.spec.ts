import { expect, test } from "@playwright/test";
import { safeNextPath } from "../../lib/routes";
import { DEMO_EMAIL_DOMAIN, DEMO_USERS } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { deleteAuthUsers } from "./helpers/supabase";

// SP1 로그인 뒤 원래 화면 복귀 (spec M6, 8.6, 8.7, screen-cases P04·P05·E02·E10·E12)

test.describe("SP1 로그인 뒤 복귀", () => {
  test("E02 SP1: 비로그인으로 /me → 로그인 → /me로 돌아오고, 새로 고침해도 로그인 유지", async ({ page }) => {
    await page.goto("/me");
    await expect(page).toHaveURL("/login?next=%2Fme");

    await submitLogin(page, "A");
    await expect(page).toHaveURL("/me");
    await expect(page.getByTestId("profile-nickname")).toHaveText(DEMO_USERS.A.nickname);

    await page.reload();
    await expect(page).toHaveURL("/me");
    await expect(page.getByTestId("profile-nickname")).toHaveText(DEMO_USERS.A.nickname);
  });

  test("E02: 보호된 주소의 쿼리까지 그대로 돌아온다", async ({ page }) => {
    await page.goto("/me?tab=host");
    await expect(page).toHaveURL("/login?next=%2Fme%3Ftab%3Dhost");

    await submitLogin(page, "B");
    await expect(page).toHaveURL("/me?tab=host");
    await expect(page.getByTestId("profile-nickname")).toHaveText(DEMO_USERS.B.nickname);
  });

  test("P04-01: next 없이 로그인하면 홈", async ({ page }) => {
    await page.goto("/login");
    await submitLogin(page, "A");
    await expect(page).toHaveURL("/");
  });

  test("SP1: 다른 사이트 주소인 next(//evil.com)는 받지 않고 홈으로", async ({ page }) => {
    await page.goto("/login?next=//evil.com");
    await submitLogin(page, "A");
    await expect(page).toHaveURL("/");
  });

  test("SP1: next 검사 규칙 (앱 안 주소만)", () => {
    expect(safeNextPath("/me")).toBe("/me");
    expect(safeNextPath("/socialings/3?from=explore")).toBe("/socialings/3?from=explore");
    for (const unsafe of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(safeNextPath(unsafe), String(unsafe)).toBe("/");
    }
  });

  test("E10: 로그인한 사람이 /login·/signup에 오면 next 주소, 없으면 홈", async ({ page }) => {
    await page.goto("/login");
    await submitLogin(page, "A");
    await expect(page).toHaveURL("/");

    await page.goto("/login?next=/me");
    await expect(page).toHaveURL("/me");
    await page.goto("/signup");
    await expect(page).toHaveURL("/");
  });

  test("E12: 로그인 ↔ 가입 화면을 오가도 next가 유지된다", async ({ page }) => {
    await page.goto("/login?next=/me");
    await expectNoHorizontalScroll(page);
    await page.getByRole("link", { name: "가입하기" }).click();
    await expect(page).toHaveURL("/signup?next=%2Fme");
    await expectNoHorizontalScroll(page);
    await page.getByRole("link", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL("/login?next=%2Fme");
  });

  test("P04-03·P04-04: 이메일 형식 오류, 틀린 비밀번호는 어느 쪽인지 밝히지 않고 입력값 유지", async ({ page }) => {
    await page.goto("/login?next=/me");

    await page.getByLabel("이메일").fill("not-an-email");
    await page.getByLabel("비밀번호", { exact: true }).fill("whatever");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByText("이메일 형식이 맞지 않아요")).toBeVisible();
    await expect(page.getByLabel("이메일")).toBeFocused();

    await page.getByLabel("이메일").fill(DEMO_USERS.A.email);
    await page.getByLabel("비밀번호", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByText("이메일 또는 비밀번호가 맞지 않아요")).toBeVisible();
    await expect(page).toHaveURL("/login?next=/me");
    await expect(page.getByLabel("이메일")).toHaveValue(DEMO_USERS.A.email);
  });

  test("P06 로그아웃 → 홈, 다시 /me는 로그인 화면으로", async ({ page }) => {
    await page.goto("/login?next=/me");
    await submitLogin(page, "A");
    await expect(page).toHaveURL("/me");

    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/me");
    await expect(page).toHaveURL("/login?next=%2Fme");
  });
});

test.describe("SP1 가입", () => {
  const created: string[] = [];
  test.afterAll(async () => {
    await deleteAuthUsers(created);
  });

  test("P05-02: 가입하면 바로 로그인되어 next 주소로 간다", async ({ page }) => {
    const suffix = Math.random().toString(36).slice(2, 8);
    const email = `e2e-${suffix}@${DEMO_EMAIL_DOMAIN}`;
    const nickname = `테스트${suffix}`;
    created.push(email);

    await page.goto("/me");
    await page.getByRole("link", { name: "가입하기" }).click();
    await expect(page).toHaveURL("/signup?next=%2Fme");

    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill(`pw-${suffix}`);
    await page.getByLabel("닉네임").fill(nickname);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();

    await expect(page).toHaveURL("/me");
    await expect(page.getByTestId("profile-nickname")).toHaveText(nickname);
  });

  test("P05-04·P05-07: 이미 가입된 이메일, 이미 쓰는 닉네임", async ({ page }) => {
    await page.goto("/signup?next=/me");

    await page.getByLabel("이메일").fill(`e2e-new-${Date.now()}@${DEMO_EMAIL_DOMAIN}`);
    await page.getByLabel("비밀번호", { exact: true }).fill("pw-123456");
    await page.getByLabel("닉네임").fill(DEMO_USERS.B.nickname);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();
    await expect(page.getByText("이미 쓰는 닉네임이에요")).toBeVisible();
    await expect(page.getByLabel("닉네임")).toBeFocused();

    await page.getByLabel("이메일").fill(DEMO_USERS.A.email);
    await page.getByLabel("닉네임").fill(`새닉${Date.now() % 100000}`);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();
    await expect(page.getByText("이미 가입된 이메일이에요")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하기" })).toHaveAttribute("href", "/login?next=%2Fme");
    await expect(page.getByLabel("이메일")).toHaveValue(DEMO_USERS.A.email);
  });

  test("P05-03·P05-05·P05-06: 이메일 형식, 비밀번호 6자 미만, 닉네임 2~12자", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("이메일").fill("wrong");
    await page.getByLabel("비밀번호", { exact: true }).fill("12345");
    await page.getByLabel("닉네임").fill("가");
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();

    await expect(page.getByText("이메일 형식이 맞지 않아요")).toBeVisible();
    await expect(page.getByText("비밀번호는 6자 이상이에요")).toBeVisible();
    await expect(page.getByText("닉네임은 2~12자예요")).toBeVisible();
    await expect(page.getByLabel("이메일")).toBeFocused();
    await expect(page).toHaveURL("/signup");
  });
});
