import { expect, test, type Page, type Route } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  createFixtureSocialing,
  deleteFixtureSocialings,
  rpc,
  signIn,
  type FixtureOptions,
} from "./helpers/supabase";

// MS14 신고 접수 (SH4b, 03 4장, spec M4·M6·8.6·8.9 P03 · screen-cases P03-18~22)
// 상세 "신청 전에 확인해 주세요" 카드 맨 아래 신고 줄 → 신고 시트 → 접수. 처리·결과 알림은 없다.
// 접수 규칙(중복·호스트·권한)을 DB가 다시 확인하는 것은 ms14-report-fn. 여기서는 화면 동작을 본다.
// 호스트 B(도현)의 테스트 전용 [E2E] 소셜링에 서윤(A)이 신고하고, 소셜링을 지우면 신고도 함께 지워진다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host: "B", capacity: 4, ...options });
  created.push(id);
  return id;
}

const detailPath = (id: number) => `/socialings/${id}`;
const QUESTION = "이 소셜링에서 문제를 겪었나요?";
const DONE = "신고를 접수했어요";
const NOTICE = "신고는 접수만 돼요. 이 데모에는 처리하는 운영자가 없어 결과를 알려 드리지 않아요";
const section = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "신청 전에 확인해 주세요" }) });
const reportButton = (page: Page) => section(page).getByRole("button", { name: "신고하기" });
const reportSheet = (page: Page) => page.getByRole("dialog", { name: "신고하기" });
const reason = (page: Page, label: string) =>
  reportSheet(page).getByRole("radiogroup", { name: "신고 사유" }).getByText(label, { exact: true });
const noteField = (page: Page) => reportSheet(page).getByRole("textbox", { name: /^설명/ });
const submit = (page: Page) => reportSheet(page).getByRole("button", { name: "신고하기" });

async function loginAs(page: Page, user: "A" | "B", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

type ReportRow = { reason: string; note: string | null };
async function reportsOf(socialingId: number): Promise<ReportRow[]> {
  return runQuery<ReportRow>(`select reason, note from public.reports where socialing_id = ${socialingId};`);
}

/** 서버 액션(신고하기) 요청만 끊는다 */
const failingAction = (route: Route) =>
  route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue();

test.describe("MS14 신고 접수 P03", () => {
  test("P03-18·19·20: 비로그인 신고하기 → 로그인 → 상세로 돌아와 한 번 더 → 시트 오류 → 그 밖의 문제 + 설명으로 접수 → '신고를 접수했어요'", async ({
    page,
  }) => {
    const id = await fixture();
    await page.goto(detailPath(id));

    // 비로그인: 줄과 신고하기(로그인으로 가는 링크). 자동으로 시트를 열지 않는다
    await expect(section(page)).toContainText(QUESTION);
    await section(page).getByRole("link", { name: "신고하기" }).click();
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(detailPath(id))}`);
    await submitLogin(page, "A");
    await expect(page).toHaveURL(detailPath(id));
    await expect(reportSheet(page)).toHaveCount(0);

    // 시트: 사유 5개, 설명, 안내
    await reportButton(page).click();
    await expect(reportSheet(page)).toBeVisible();
    await expect(reportSheet(page).getByRole("radio")).toHaveCount(5);
    for (const label of [
      "종교 활동이나 영업을 권유했어요",
      "앱에 적힌 금액 외에 돈을 요구했어요",
      "스태프가 참가자인 척했어요",
      "호스트가 원치 않는 연락이나 만남을 요구했어요",
      "그 밖의 문제",
    ]) {
      await expect(reason(page, label)).toBeVisible();
    }
    await expect(reportSheet(page)).toContainText(NOTICE);
    await expect(reportSheet(page)).toContainText("0 / 300");

    // 사유 없이 → 오류. 그 밖의 문제 + 설명 없음 → 오류
    await submit(page).click();
    await expect(reportSheet(page).locator("#field-reason-error")).toHaveText("신고 사유를 골라 주세요");
    await reason(page, "그 밖의 문제").click();
    await expect(reportSheet(page).locator("#field-reason-error")).toHaveCount(0);
    await expect(noteField(page)).toHaveAccessibleName("설명");
    await noteField(page).fill("   ");
    await submit(page).click();
    await expect(reportSheet(page).locator("#field-note-error")).toHaveText("어떤 문제였는지 적어 주세요");
    await expect(noteField(page)).toBeFocused();
    expect(await reportsOf(id)).toEqual([]);

    // 접수: 시트가 닫히고 안내, 줄은 "신고를 접수했어요"(버튼 없음)
    await noteField(page).fill("  모임 단톡방에서 다른 유료 강의를 계속 권했어요  ");
    await submit(page).click();
    await expect(reportSheet(page)).toHaveCount(0);
    await expect(page.getByTestId("toast")).toHaveText(DONE);
    await expect(section(page)).toContainText(DONE);
    await expect(reportButton(page)).toHaveCount(0);
    expect(await reportsOf(id)).toEqual([{ reason: "other", note: "모임 단톡방에서 다른 유료 강의를 계속 권했어요" }]);

    // 다시 들어와도 접수 줄 (P03-20)
    await page.reload();
    await expect(section(page)).toContainText(DONE);
    await expect(section(page)).not.toContainText(QUESTION);
  });

  test("P03-21: 호스트 본인에게는 신고 줄이 없고, 종료·호스트 취소 소셜링에도 신고 줄이 있다. 설명 없이 사유만으로 접수된다", async ({
    page,
  }) => {
    const [open, canceled, completed] = await Promise.all([
      fixture(),
      fixture({ status: "canceled" }),
      fixture({ status: "completed", deadlineInHours: -26, startsInHours: -25 }),
    ]);
    await loginAs(page, "B", detailPath(open));
    await expect(section(page)).toBeVisible();
    await expect(section(page)).not.toContainText(QUESTION);
    await expect(section(page).getByRole("button", { name: "신고하기" })).toHaveCount(0);

    await page.context().clearCookies();
    await loginAs(page, "A", detailPath(canceled));
    await expect(section(page)).toContainText(QUESTION);
    await page.goto(detailPath(completed));
    await reportButton(page).click();
    await reason(page, "앱에 적힌 금액 외에 돈을 요구했어요").click();
    await expect(noteField(page)).toHaveAccessibleName("설명 (선택)");
    await submit(page).click();
    await expect(section(page)).toContainText(DONE);
    expect(await reportsOf(completed)).toEqual([{ reason: "extra_money", note: null }]);
  });

  test("P03-20·22: 이미 신고했으면 들어올 때부터 접수 줄. 시트를 연 사이 이미 신고됐으면 결과는 접수, 네트워크 오류는 시트를 연 채 다시 시도", async ({
    page,
    request,
  }) => {
    const [already, racing, failing] = await Promise.all([fixture(), fixture(), fixture()]);
    const token = await signIn(request, "A");
    await rpc(request, "create_report", { p_socialing_id: already, p_reason: "solicitation" }, token);

    await loginAs(page, "A", detailPath(already));
    await expect(section(page)).toContainText(DONE);
    await expect(reportButton(page)).toHaveCount(0);

    // 시트를 연 사이 다른 창에서 신고함 → 누르면 "신고를 접수했어요" (중복 행 없음)
    await page.goto(detailPath(racing));
    await reportButton(page).click();
    await reason(page, "스태프가 참가자인 척했어요").click();
    await rpc(request, "create_report", { p_socialing_id: racing, p_reason: "fake_participant" }, token);
    await submit(page).click();
    await expect(reportSheet(page)).toHaveCount(0);
    await expect(section(page)).toContainText(DONE);
    expect(await reportsOf(racing)).toHaveLength(1);

    // 네트워크 오류 → 시트를 연 채 안내 + 다시 시도 → 다시 누르면 접수
    await page.goto(detailPath(failing));
    await reportButton(page).click();
    await reason(page, "종교 활동이나 영업을 권유했어요").click();
    await page.route(`**${detailPath(failing)}`, failingAction);
    await submit(page).click();
    await expect(reportSheet(page).getByRole("alert")).toHaveText(
      "신고하지 못했어요. 연결을 확인하고 다시 시도해 주세요",
    );
    await expect(reason(page, "종교 활동이나 영업을 권유했어요")).toBeVisible();
    await page.unroute(`**${detailPath(failing)}`, failingAction);
    await reportSheet(page).getByRole("button", { name: "다시 시도" }).click();
    await expect(reportSheet(page)).toHaveCount(0);
    expect(await reportsOf(failing)).toEqual([{ reason: "solicitation", note: null }]);
  });

  test("신고 시트: 390px·320px 가로 스크롤 없음, 320px에서도 버튼이 보이고 돌아가기로 닫는다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", detailPath(id));
    await reportButton(page).click();
    await reason(page, "호스트가 원치 않는 연락이나 만남을 요구했어요").click();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await expect(submit(page)).toBeInViewport();
    await reportSheet(page).getByRole("button", { name: "돌아가기" }).click();
    await expect(reportSheet(page)).toHaveCount(0);
    await expect(reportButton(page)).toBeFocused();
    expect(await reportsOf(id)).toEqual([]);
  });
});
