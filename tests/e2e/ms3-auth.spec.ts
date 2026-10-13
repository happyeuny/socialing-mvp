import { expect, test, type Page } from "@playwright/test";
import { DEMO_EMAIL_DOMAIN, DEMO_USERS } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll } from "./helpers/auth";
import { deleteAuthUsers } from "./helpers/supabase";

// MS3 로그인 P04 · 가입 P05 다듬기와 짧은 안내(toast) (spec 8.2, 8.6, screen-cases P04·P05·C12, DESIGN.md text-field·toast)
// 기능 흐름(next 복귀, 입력 오류)은 sp1-login.spec.ts. 여기서는 시안 모양, 비밀번호 보기, 서버 실패, 환영 안내를 본다.

const password = (page: Page) => page.getByLabel("비밀번호", { exact: true });

/** 눈 아이콘으로 비밀번호를 보였다 숨긴다 */
async function expectPasswordToggle(page: Page) {
  await password(page).fill("secret-123");
  await expect(password(page)).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "비밀번호 보기" }).click();
  await expect(password(page)).toHaveAttribute("type", "text");
  await expect(password(page)).toHaveValue("secret-123");

  await page.getByRole("button", { name: "비밀번호 숨기기" }).click();
  await expect(password(page)).toHaveAttribute("type", "password");

  const box = await page.getByRole("button", { name: "비밀번호 보기" }).boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
}

test.describe("MS3 P04 로그인", () => {
  test("P04-01: 안내 문구, 입력 예시, 비밀번호 보기 (390px·320px 가로 스크롤 없음)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("로그인하면 보던 화면으로 돌아가요")).toBeVisible();
    await expect(page.getByLabel("이메일")).toHaveAttribute("placeholder", "example@email.com");
    await expect(password(page)).toHaveAttribute("placeholder", "비밀번호를 입력해 주세요");
    await expectPasswordToggle(page);
    await expectNoHorizontalScroll(page);

    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });

  test("P04-05: 서버 실패면 '로그인하지 못했어요. 다시 시도해 주세요', 입력값 유지 (?_state=error)", async ({ page }) => {
    await page.goto("/login?next=/me&_state=error");
    await page.getByLabel("이메일").fill(DEMO_USERS.A.email);
    await password(page).fill(process.env.DEMO_PASSWORD ?? "");
    await page.getByRole("button", { name: "로그인" }).click();

    await expect(page.getByText("로그인하지 못했어요. 다시 시도해 주세요")).toBeVisible();
    await expect(page).toHaveURL("/login?next=/me&_state=error");
    await expect(page.getByLabel("이메일")).toHaveValue(DEMO_USERS.A.email);
    // 버튼은 다시 누를 수 있다
    await expect(page.getByRole("button", { name: "로그인" })).toBeEnabled();
  });
});

test.describe("MS3 P05 가입", () => {
  const created: string[] = [];
  test.afterAll(async () => {
    await deleteAuthUsers(created);
  });

  function newAccount() {
    const suffix = Math.random().toString(36).slice(2, 8);
    const email = `e2e-${suffix}@${DEMO_EMAIL_DOMAIN}`;
    created.push(email);
    return { email, password: `pw-${suffix}`, nickname: `환영${suffix}` };
  }

  test("P05 기본: 위 안내, 칸 아래 도움말, 비밀번호 보기, '가입하고 시작하기' (390px·320px)", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText("새로운 여정")).toBeVisible();
    await expect(page.getByText("함께할 문화 메이트를 찾아요")).toBeVisible();
    await expect(page.getByLabel("이메일")).toHaveAttribute("placeholder", "example@email.com");
    await expect(password(page)).toHaveAccessibleDescription("6자 이상");
    await expect(page.getByLabel("닉네임")).toHaveAttribute("placeholder", "닉네임을 입력해 주세요");
    await expect(page.getByLabel("닉네임")).toHaveAccessibleDescription("2~12자 · 후기와 호스트 이름으로 보여요");
    await expect(page.getByRole("button", { name: "가입하고 시작하기" })).toBeVisible();
    await expectPasswordToggle(page);
    await expectNoHorizontalScroll(page);

    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });

  test("P05-05: 입력 오류가 나면 도움말 자리에 이유가 보인다", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("이메일").fill(`e2e-short@${DEMO_EMAIL_DOMAIN}`);
    await password(page).fill("12345");
    await page.getByLabel("닉네임").fill("짧은비번");
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();

    await expect(password(page)).toHaveAccessibleDescription("비밀번호는 6자 이상이에요");
    await expect(page.getByText("6자 이상", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("닉네임")).toHaveAccessibleDescription("2~12자 · 후기와 호스트 이름으로 보여요");
  });

  test("P05-01·C12: 가입하면 홈으로 가고 아래 탭 바로 위에 '환영해요, ○○님'이 잠깐 뜬다", async ({ page }) => {
    const account = newAccount();
    await page.goto("/signup");
    await page.getByLabel("이메일").fill(account.email);
    await password(page).fill(account.password);
    await page.getByLabel("닉네임").fill(account.nickname);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();

    await expect(page).toHaveURL("/");
    const toast = page.getByTestId("toast");
    await expect(toast).toHaveText(`환영해요, ${account.nickname}님`);
    // 읽기 프로그램이 읽는 안내 영역 안에 뜬다
    await expect(page.locator('[aria-live="polite"]').filter({ has: toast })).toHaveCount(1);
    // 머리글이 로그인 상태(닉네임 첫 글자 원)로 바뀌었다
    await expect(page.getByRole("banner").getByRole("link", { name: "로그인" })).toHaveCount(0);

    // 아래 탭을 가리지 않고 바로 위에 뜬다
    const tabBar = await page.getByRole("navigation", { name: "아래 탭" }).boundingBox();
    const box = await toast.boundingBox();
    expect(box && tabBar).toBeTruthy();
    expect(box!.y + box!.height).toBeLessThanOrEqual(tabBar!.y);
    expect(tabBar!.y - (box!.y + box!.height)).toBeLessThanOrEqual(12);
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390 - 16);

    // 잠깐 뒤 사라진다
    await expect(toast).toHaveCount(0, { timeout: 8_000 });
  });

  test("P05-08: 서버 실패면 '가입하지 못했어요. 다시 시도해 주세요', 입력값 유지, 가입되지 않는다 (?_state=error)", async ({
    page,
  }) => {
    const account = newAccount();
    await page.goto("/signup?_state=error");
    await page.getByLabel("이메일").fill(account.email);
    await password(page).fill(account.password);
    await page.getByLabel("닉네임").fill(account.nickname);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();

    await expect(page.getByText("가입하지 못했어요. 다시 시도해 주세요")).toBeVisible();
    await expect(page).toHaveURL("/signup?_state=error");
    await expect(page.getByLabel("이메일")).toHaveValue(account.email);
    await expect(page.getByLabel("닉네임")).toHaveValue(account.nickname);
    await expect(page.getByTestId("toast")).toHaveCount(0);

    // 흉내 없이 같은 값으로 다시 보내면 가입된다 (앞에서 계정이 만들어지지 않았다)
    await page.goto("/signup?next=/me");
    await page.getByLabel("이메일").fill(account.email);
    await password(page).fill(account.password);
    await page.getByLabel("닉네임").fill(account.nickname);
    await page.getByRole("button", { name: "가입하고 시작하기" }).click();
    await expect(page).toHaveURL("/me");
    await expect(page.getByTestId("toast")).toHaveText(`환영해요, ${account.nickname}님`);
  });
});
