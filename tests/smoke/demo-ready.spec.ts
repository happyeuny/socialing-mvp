import { expect, test, type Page } from "@playwright/test";
import { submitLogin } from "../e2e/helpers/auth";

// 운영 주소 읽기 점검 (npm run test:smoke, docs/demo-checklist.md). 화면만 열고 로그인만 해서 데이터를 바꾸지 않는다.
// 1. 운영 주소가 어느 DB를 보는지: 로그인 쿠키 이름(sb-<프로젝트 ref>-auth-token)을 dev 주소(NEXT_PUBLIC_SUPABASE_URL)와 비교한다.
//    SMOKE_DB=demo(기본)면 dev가 아니어야 하고, SMOKE_DB=dev면 dev여야 한다. 값은 출력하지 않는다.
// 2. 시연을 처음부터 할 수 있는 상태인지: 시드 그대로인지(A가 4단계 소셜링에 아직 신청하지 않음 등) 본다.
//    리허설 뒤라 실패하면 "발표 DB 준비"(시드 다시)를 돌린다.

const SEED = {
  approval: "영어로 내 일 소개하기: 3분 스피치", // 4~6단계: B 호스트 승인, 모집중
  x: "퇴근 후 영어 회화: 여행 영어 롤플레이", // 7~9단계 X: B, 확정, 일시 지남, A 참여 확정
  y: "영어 뉴스 한 편 같이 읽기", // X 대체: B, 종료, A 참여 확정
};

const expectedDb = process.env.SMOKE_DB === "dev" ? "dev" : "demo";

const card = (page: Page, title: string) =>
  page.locator("article").filter({ has: page.getByRole("link", { name: title, exact: true }) });

async function expectNoScreenError(page: Page) {
  await expect(page.getByText("불러오지 못했어요")).toHaveCount(0);
}

async function loginAs(page: Page, user: "A" | "B", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page, `${user} 로그인 (DEMO_PASSWORD가 발표 DB와 같은지)`).toHaveURL(next);
}

test.describe("운영 주소 점검 (읽기만)", () => {
  test(`로그인 쿠키로 본 DB가 ${expectedDb}다`, async ({ page }) => {
    const devUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(devUrl, "비교할 dev 주소 NEXT_PUBLIC_SUPABASE_URL").toBeTruthy();
    const devRef = new URL(devUrl!).hostname.split(".")[0];

    await loginAs(page, "A", "/me");
    const names = (await page.context().cookies()).map((cookie) => cookie.name);
    const authCookie = names.find((name) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(name));
    expect(authCookie, "Supabase 로그인 쿠키").toBeTruthy();
    const isDev = authCookie!.split("-")[1] === devRef;
    const message =
      expectedDb === "dev" ? "dev DB를 봐야 해요" : "dev가 아닌 발표 DB를 봐야 해요 (Vercel Production 값 + Redeploy)";
    expect(isDev, message).toBe(expectedDb === "dev");
  });

  test("1·3단계: 홈 → 탐색 → B 상세에 모집중과 등급 라벨, 인증 후기", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("article").first()).toBeVisible();
    await expectNoScreenError(page);

    await page.goto("/explore");
    await expect(page.getByText("가까운 일시 순").first()).toBeVisible();
    await expectNoScreenError(page);
    await card(page, SEED.approval).getByRole("link", { name: SEED.approval, exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: SEED.approval })).toBeVisible();
    await expect(page.getByText("모집중").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /믿고 가는 호스트/ })).toHaveCount(2);
    await expectNoScreenError(page);

    await page.goto("/reviews");
    await expect(page.locator("article").first()).toBeVisible();
    await expectNoScreenError(page);
  });

  test("A 서윤: X는 확정·참여 확정, 4단계 소셜링에는 아직 신청 전", async ({ page }) => {
    await loginAs(page, "A", "/me");
    await expect(card(page, SEED.x)).toContainText("확정");
    await expect(card(page, SEED.x)).toContainText("참여 확정");
    await expect(card(page, SEED.y)).toBeVisible();
    await expect(card(page, SEED.approval), "리허설 뒤라면 발표 DB 준비(시드 다시)를 돌려 주세요").toHaveCount(0);
    await expectNoScreenError(page);
  });

  test("B 도현: 호스트인 소셜링에 4단계 소셜링·X·Y", async ({ page }) => {
    await loginAs(page, "B", "/me?tab=host");
    await expect(card(page, SEED.approval)).toContainText("모집중");
    await expect(card(page, SEED.x)).toContainText("확정");
    await expect(card(page, SEED.y)).toContainText("종료");
    await expectNoScreenError(page);
  });
});
