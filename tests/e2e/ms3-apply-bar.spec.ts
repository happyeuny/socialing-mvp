import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  addReview,
  createFixtureSocialing,
  deleteFixtureSocialings,
  type FixtureOptions,
} from "./helpers/supabase";

// MS3 상세 아래 고정 영역의 로그인한 사람 보기 줄 (spec 8.4 1·3·4·5·6·8줄 · DESIGN.md C4 apply-bar
// · screen-cases P03-B01·B02·B04·B05·B06·B07·B10). 순서표 우선순위(호스트 > 호스트 취소 > 내 신청)도 본다.
// 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const PAST = { deadlineInHours: -30, startsInHours: -24 } as const;

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

async function loginAs(page: Page, user: "C" | "P1") {
  await page.goto("/login");
  await submitLogin(page, user);
  await expect(page).toHaveURL("/");
}

test.describe("MS3 상세 아래 영역: 호스트", () => {
  test("P03-B01·B02: 호스트는 '관리하기', 승인 대기가 있으면 '관리하기 · 승인 대기' + 건수 (호스트 취소해도 1줄)", async ({
    page,
  }) => {
    const [noPending, withPending, canceled] = await Promise.all([
      fixture({ host: "C", joinType: "approval" }),
      fixture({ host: "C", joinType: "approval", capacity: 5 }),
      fixture({ host: "C", status: "canceled", accepted: ["P1"] }),
    ]);
    await addApplication(withPending, "P1", "pending");
    await addApplication(withPending, "P2", "pending");
    await addApplication(withPending, "P3", "rejected");
    await loginAs(page, "C");

    // P03-B01
    await page.goto(`/socialings/${noPending}`);
    await expect(bar(page)).toContainText("내가 연 소셜링이에요");
    const manage = bar(page).getByRole("link", { name: "관리하기", exact: true });
    await expect(manage).toHaveAttribute("href", `/socialings/${noPending}/manage`);
    await expect(bar(page).getByRole("link", { name: "신청하기" })).toHaveCount(0);

    // P03-B02: 승인 대기 2건 (거절은 세지 않는다), 숫자는 point 색
    await page.goto(`/socialings/${withPending}`);
    const managePending = bar(page).getByRole("link", { name: /^관리하기 · 승인 대기 2 ?건$/ });
    await expect(managePending).toHaveAttribute("href", `/socialings/${withPending}/manage`);
    await expect(managePending.getByText("2건", { exact: true })).toHaveCSS("background-color", "rgb(245, 166, 35)");
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    // 1줄이 2줄(호스트 취소)보다 먼저
    await page.goto(`/socialings/${canceled}`);
    await expect(bar(page).getByRole("link", { name: "관리하기", exact: true })).toBeVisible();
    await expect(bar(page)).not.toContainText("호스트가 취소한 소셜링이에요");
  });
});

test.describe("MS3 상세 아래 영역: 참여 확정자·신청자", () => {
  test("P03-B04·B05·B06·B07·B10: 종료 뒤 후기, 일시 지남, 승인 대기 무응답", async ({ page }) => {
    const [reviewWrite, reviewDone, waitEnd, notConfirmed, pendingExpired] = await Promise.all([
      fixture({ host: "C", status: "completed", ...PAST, accepted: ["P1"] }),
      fixture({ host: "C", status: "completed", ...PAST, accepted: ["P1"] }),
      fixture({ host: "C", status: "confirmed", ...PAST, accepted: ["P1"] }),
      fixture({ host: "C", status: "recruiting", ...PAST, accepted: ["P1"] }),
      fixture({ host: "C", joinType: "approval", status: "confirmed", ...PAST, accepted: ["P2"] }),
    ]);
    await addReview(reviewDone, "P1");
    await addApplication(pendingExpired, "P1", "pending");
    await loginAs(page, "P1");

    // P03-B04 3줄: 소셜링이 끝났어요 + 후기 쓰기
    await page.goto(`/socialings/${reviewWrite}`);
    await expect(bar(page)).toContainText("소셜링이 끝났어요");
    await expect(bar(page).getByRole("link", { name: "후기 쓰기" })).toHaveAttribute(
      "href",
      `/socialings/${reviewWrite}/review`,
    );

    // P03-B05 4줄: 후기 작성 완료, 버튼 없음
    await page.goto(`/socialings/${reviewDone}`);
    await expect(bar(page)).toHaveText("후기 작성 완료");
    await expect(bar(page).getByRole("link")).toHaveCount(0);
    await expect(bar(page).getByRole("button")).toHaveCount(0);

    // P03-B06 5줄: 확정 + 일시 지남 → 종료를 기다림
    await page.goto(`/socialings/${waitEnd}`);
    await expect(bar(page).getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("소셜링 일시가 지났어요");
    await expect(bar(page)).toContainText("호스트가 종료하면 후기를 쓸 수 있어요");
    await expect(bar(page).getByRole("button", { name: "지난 소셜링" })).toHaveCount(0);

    // P03-B07 6줄: 모집중 그대로 일시 지남 → 후기 불가
    await page.goto(`/socialings/${notConfirmed}`);
    await expect(bar(page).getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("호스트가 확정하지 않은 소셜링이라 후기를 쓸 수 없어요");

    // P03-B10 8줄: 승인 대기인 채로 일시 지남
    await page.goto(`/socialings/${pendingExpired}`);
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("소셜링 일시가 지났어요");
    await expect(bar(page)).toContainText("호스트가 응답하지 않았어요");
    await expectNoHorizontalScroll(page);
  });

  test("순서표: 호스트 취소(2줄)가 내 신청 줄보다 먼저, 신청하지 않은 사람은 13줄", async ({ page }) => {
    const [canceledPast, completed] = await Promise.all([
      fixture({ host: "C", status: "canceled", ...PAST, accepted: ["P1"] }),
      fixture({ host: "C", status: "completed", ...PAST, accepted: ["P2"] }),
    ]);
    await loginAs(page, "P1");

    await page.goto(`/socialings/${canceledPast}`);
    await expect(bar(page).getByRole("button", { name: "호스트 취소" })).toBeDisabled();
    await expect(bar(page)).toContainText("호스트가 취소한 소셜링이에요");
    await expect(bar(page)).not.toContainText("참여 확정");

    // 참여하지 않은 종료 소셜링: 후기 쓰기 없이 지난 소셜링
    await page.goto(`/socialings/${completed}`);
    await expect(bar(page).getByRole("button", { name: "지난 소셜링" })).toBeDisabled();
    await expect(bar(page).getByRole("link", { name: "후기 쓰기" })).toHaveCount(0);
  });
});
