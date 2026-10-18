import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatDateTime } from "../../lib/format";
import { DEMO_USERS, type DemoUserKey } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  socialingStateOf,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS15 U4 소셜링 관리 P11 (04 3.6, spec 8.8 · DESIGN.md manage-summary·progress-steps/awaiting-confirm
// ·manage-status-actions/recruiting·computed-cancel · screen-cases P11-01·04·24~26).
// 버튼을 보일지·막을지와 이유는 뷰(my_hosted_socialings)가 계산한다(ms15-host-actions-fn). 여기서는 화면이 그 값으로
// 요약 줄·확정 대기 줄·확정 설명과 막힌 이유·계산 취소 안내를 고르는지 본다.
// 확정 대기·취소·확정하지 않은 호스트 취소는 지난 신청 마감·확정 기한으로 직접 넣어 만든다(12시간 검사에 걸리지 않음, 04 8.3).
// 호스트 C(하린)의 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Partial<FixtureOptions>) {
  const id = await createFixtureSocialing({ host: "C", joinType: "approval", capacity: 4, ...options });
  created.push(id);
  return id;
}

/** 신청 마감이 2시간 전에 지났고 확정 기한·일시는 앞 (확정 대기 또는 취소) */
const AFTER_DEADLINE = { deadlineInHours: -2, confirmInHours: 20, startsInHours: 40 } as const;
/** 확정 기한까지 지났고 일시는 앞 (확정하지 않으면 호스트 취소) */
const AFTER_CONFIRM = { deadlineInHours: -30, confirmInHours: -2, startsInHours: 40 } as const;
const CONFIRM_RULES =
  "신청 마감 때 최소 인원이 될 수 없으면 바로 취소되고, 최소 인원이 모였는데 기한까지 확정하지 않으면 호스트 취소로 기록돼요.";

const manage = (id: number) => `/socialings/${id}/manage`;
const summary = (page: Page) => page.getByRole("region", { name: "소셜링 요약" });
const status = (page: Page) => page.getByRole("region", { name: "소셜링 상태" });
const steps = (page: Page) => page.getByRole("list", { name: "소셜링 진행 단계" });
const confirmNote = (page: Page) => page.locator("#confirm-note");
const button = (page: Page, name: string) => status(page).getByRole("button", { name, exact: true });
const list = (page: Page) => page.getByRole("list", { name: "신청자 목록" });
const row = (page: Page, user: DemoUserKey) =>
  list(page).getByRole("listitem").filter({ hasText: DEMO_USERS[user].nickname });
const dialog = (page: Page) => page.getByRole("alertdialog");
const toast = (page: Page) => page.getByTestId("toast");

async function confirmAtOf(request: APIRequestContext, id: number) {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialing_summaries?select=confirm_deadline_at&id=eq.${id}`,
    { headers: apiHeaders() },
  );
  const [row] = (await response.json()) as { confirm_deadline_at: string }[];
  return formatDateTime(row.confirm_deadline_at);
}

async function loginAs(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, "C");
  await expect(page).toHaveURL(next);
}

test.describe("MS15 소셜링 관리", () => {
  test("P11-01·26: 요약 줄 '최소 N명', 최소 인원 전이면 확정 막힘 + 지금 인원·승인 대기, 승인해서 채우면 확정 설명", async ({
    page,
    request,
  }) => {
    const id = await fixture({ capacity: 8, minParticipants: 4, staffCount: 1, accepted: ["P1", "P2"] });
    await addApplication(id, "P3", "pending");
    await addApplication(id, "P4", "pending");
    const firstCome = await fixture({ joinType: "first_come", accepted: ["P1"] });
    const confirmAt = await confirmAtOf(request, id);
    await loginAs(page, manage(id));

    // 요약: 참가자 · 최소 · 스태프 · 승인 대기 순서
    await expect(summary(page)).toContainText(/참가자 2\/8명\s*· 최소 4명\s*· 스태프 1명\s*· 승인 대기\s*2/);
    await expect(summary(page)).toContainText("최소 인원까지 2명");

    // P11-26 최소 인원 전: 막힌 이유에 지금 인원과 승인 대기
    await expect(button(page, "확정하기")).toBeDisabled();
    await expect(confirmNote(page)).toHaveText("최소 인원(4명)이 모여야 확정할 수 있어요 · 지금 2명 · 승인 대기 2명");
    await expect(button(page, "호스트 취소")).toBeEnabled();
    await expect(status(page).getByRole("link", { name: "수정" })).toBeVisible();

    await row(page, "P3").getByRole("button", { name: "승인" }).click();
    await expect(toast(page)).toHaveText("승인했어요");
    await expect(confirmNote(page)).toHaveText("최소 인원(4명)이 모여야 확정할 수 있어요 · 지금 3명 · 승인 대기 1명");

    await row(page, "P4").getByRole("button", { name: "승인" }).click();
    await expect(summary(page)).toContainText(/참가자 4\/8명\s*· 최소 4명/);
    // P11-01: 최소 인원이 모이면 확정할 수 있고, 아래 설명에 확정 기한
    await expect(button(page, "확정하기")).toBeEnabled();
    await expect(confirmNote(page)).toHaveText(`최소 4명이 모이면 확정 기한(${confirmAt})까지 확정할 수 있어요. ${CONFIRM_RULES}`);
    await expect(summary(page)).not.toContainText("최소 인원까지");

    // 선착순은 승인 대기가 없어 지금 인원만
    await page.goto(manage(firstCome));
    await expect(confirmNote(page)).toHaveText("최소 인원(2명)이 모여야 확정할 수 있어요 · 지금 1명");
  });

  test("P11-25: 확정 대기는 진행 단계 아래 '확정 대기 · …까지', 승인으로 최소 인원을 채워 확정하면 확정 단계로", async ({
    page,
    request,
  }) => {
    // 참여 확정 1 + 승인 대기 2 ≥ 최소 2 → 신청 마감 뒤 확정 대기
    const id = await fixture({ ...AFTER_DEADLINE, accepted: ["P1"] });
    await addApplication(id, "P2", "pending");
    await addApplication(id, "P3", "pending");
    const confirmAt = await confirmAtOf(request, id);
    await loginAs(page, manage(id));

    await expect(summary(page)).toContainText("확정 대기");
    await expect(summary(page)).toContainText(/참가자 1\/4명\s*· 최소 2명/);
    await expect(steps(page).locator('[aria-current="step"]')).toContainText("모집중");
    await expect(status(page)).toContainText(`확정 대기 · ${confirmAt}까지`);
    await expect(button(page, "확정하기")).toBeDisabled();
    await expect(confirmNote(page)).toHaveText("최소 인원(2명)이 모여야 확정할 수 있어요 · 지금 1명 · 승인 대기 2명");
    // 확정 대기 중에도 수정·호스트 취소·승인이 된다 (04 2.5)
    await expect(button(page, "호스트 취소")).toBeEnabled();
    await expect(status(page).getByRole("link", { name: "수정" })).toBeVisible();
    await expect(button(page, "종료하기")).toBeDisabled();
    await expect(status(page)).toContainText("확정한 뒤 소셜링 일시가 지나야 종료할 수 있어요");

    await row(page, "P2").getByRole("button", { name: "승인" }).click();
    await expect(toast(page)).toHaveText("승인했어요");
    await expect(button(page, "확정하기")).toBeEnabled();
    await expect(confirmNote(page)).toHaveText(`최소 2명이 모이면 확정 기한(${confirmAt})까지 확정할 수 있어요. ${CONFIRM_RULES}`);

    // 390·320px 가로 스크롤 없음 (확정 대기 줄과 긴 설명)
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);

    await button(page, "확정하기").click();
    await expect(dialog(page).getByRole("heading")).toHaveText("확정할까요?");
    await dialog(page).getByRole("button", { name: "확정하기" }).click();
    await expect(toast(page)).toHaveText("확정했어요");
    await expect(steps(page).locator('[aria-current="step"]')).toContainText("확정");
    await expect(status(page)).not.toContainText("확정 대기");
    await expect(summary(page)).not.toContainText("최소");
    expect((await socialingStateOf(id)).status).toBe("confirmed");
  });

  test("P11-04·24: 계산으로 취소·호스트 취소면 진행 단계와 상태 버튼 대신 안내, 신청자 목록은 보기만, 상세 보기는 남는다", async ({
    page,
  }) => {
    // 최소 3명인데 참여 확정 1 + 승인 대기 1 → 신청 마감 때 취소(최소 인원 미달)
    const autoCanceled = await fixture({ ...AFTER_DEADLINE, minParticipants: 3, accepted: ["P1"] });
    await addApplication(autoCanceled, "P2", "pending");
    // 참여 확정 2 ≥ 최소 2인데 확정 기한까지 확정하지 않음 → 호스트 취소
    const notConfirmed = await fixture({ ...AFTER_CONFIRM, accepted: ["P1", "P2"] });
    await addApplication(notConfirmed, "P3", "pending");

    const cases = [
      { id: autoCanceled, badge: "취소", notice: "취소된 소셜링이에요 · 최소 인원(3명)이 모이지 않았어요", pending: "P2" },
      { id: notConfirmed, badge: "호스트 취소", notice: "호스트 취소 · 확정 기한까지 확정하지 않았어요", pending: "P3" },
    ] as const;

    await loginAs(page, manage(autoCanceled));
    for (const { id, badge, notice, pending } of cases) {
      await page.goto(manage(id));
      await expect(summary(page).getByText(badge, { exact: true })).toBeVisible();
      await expect(summary(page)).not.toContainText("최소");
      await expect(status(page)).toContainText(notice);
      await expect(steps(page)).toHaveCount(0);
      await expect(status(page).getByRole("button")).toHaveCount(0);
      await expect(status(page).getByRole("link")).toHaveCount(0);
      // 승인 대기 건은 버튼 없이 칩만
      await expect(row(page, pending)).toContainText("승인 대기");
      await expect(row(page, pending).getByRole("button")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "상세 보기" })).toHaveAttribute("href", `/socialings/${id}`);
      await page.setViewportSize({ width: 320, height: 640 });
      await expectNoHorizontalScroll(page);
      await page.setViewportSize({ width: 390, height: 844 });
    }
  });
});
