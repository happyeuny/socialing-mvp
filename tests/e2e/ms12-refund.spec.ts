import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatDateTime } from "../../lib/format";
import {
  acceptedCancelRate,
  cancelRefundNotice,
  refundDeadlines,
  refundPolicyText,
  showsRefundPolicy,
} from "../../lib/refund-policy";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  supabaseUrl,
} from "./helpers/supabase";

// MS12 U1 취소·환불 규칙 안내 (spec 6장 환불 기준, M4·M7, 8.2 O02·O05 · screen-cases P03-11·12, O02, O05 · 시나리오 3·4단계)
// 계산(72·24시간 경계, 지난 구간 줄 빼기, 선착순, 0원)은 브라우저 없이 함수로, 화면은 테스트 전용 [E2E] 소셜링으로 본다.
// 소셜링은 한꺼번에 만든다(픽스처를 차례로 많이 만들면 30초를 넘김). 신청은 하지 않고 창만 열었다 닫는다.

test.describe("MS12 환불 기준 계산 (lib/refund-policy.ts)", () => {
  // 소셜링 일시 2026-10-22(목) 오후 7:30 한국 시간
  const startsAt = "2026-10-22T10:30:00.000Z";
  const at = (iso: string) => new Date(iso);

  test("기준 시각은 72시간 전·24시간 전, 그 시각까지는 앞 구간", () => {
    const { full, half } = refundDeadlines(startsAt);
    expect(full.toISOString()).toBe("2026-10-19T10:30:00.000Z");
    expect(half.toISOString()).toBe("2026-10-21T10:30:00.000Z");
    expect(acceptedCancelRate(startsAt, full)).toBe(100);
    expect(acceptedCancelRate(startsAt, new Date(full.getTime() + 1))).toBe(50);
    expect(acceptedCancelRate(startsAt, half)).toBe(50);
    expect(acceptedCancelRate(startsAt, new Date(half.getTime() + 1))).toBe(0);
  });

  test("목록은 실제 시각으로, 지난 구간 줄은 빠지고 '환불 없음'은 늘 남는다", () => {
    expect(refundPolicyText(startsAt, "approval", at("2026-10-16T01:00:00Z"))).toEqual({
      acceptedLines: [
        "10/19(월) 오후 7:30까지: 전액 환불",
        "10/21(수) 오후 7:30까지: 50% 환불",
        "10/21(수) 오후 7:30 뒤: 환불 없음",
      ],
      alwaysFull: "승인 전에 신청 취소 · 호스트가 거절 · 호스트 취소 · 최소 인원이 모이지 않아 취소",
    });
    // 10/20: 전액 구간이 지남. 선착순은 승인 단계가 없어 "호스트 취소 · 최소 인원이 모이지 않아 취소"만 (MS15 U4)
    expect(refundPolicyText(startsAt, "first_come", at("2026-10-20T01:00:00Z"))).toEqual({
      acceptedLines: ["10/21(수) 오후 7:30까지: 50% 환불", "10/21(수) 오후 7:30 뒤: 환불 없음"],
      alwaysFull: "호스트 취소 · 최소 인원이 모이지 않아 취소",
    });
    expect(refundPolicyText(startsAt, "first_come", at("2026-10-22T01:00:00Z")).acceptedLines).toEqual([
      "10/21(수) 오후 7:30 뒤: 환불 없음",
    ]);
  });

  test("참가비 0원이거나 소셜링 일시가 지나면 안내하지 않는다", () => {
    const now = at("2026-10-16T01:00:00Z");
    expect(showsRefundPolicy(15000, startsAt, now)).toBe(true);
    expect(showsRefundPolicy(0, startsAt, now)).toBe(false);
    expect(showsRefundPolicy(15000, startsAt, at(startsAt))).toBe(false);
  });

  test("O05 한 줄: 승인 대기는 전액, 참여 확정은 지금 구간", () => {
    expect(cancelRefundNotice("pending", startsAt, at("2026-10-22T09:00:00Z"))).toBe("승인 전 취소라 전액 환불 기준이에요");
    expect(cancelRefundNotice("accepted", startsAt, at("2026-10-17T10:30:00Z"))).toBe("지금 취소하면 전액 환불 기준이에요");
    expect(cancelRefundNotice("accepted", startsAt, at("2026-10-20T10:30:00Z"))).toBe("지금 취소하면 50% 환불 기준이에요");
    expect(cancelRefundNotice("accepted", startsAt, at("2026-10-21T22:30:00Z"))).toBe(
      "지금 취소하면 환불되지 않는 기준이에요",
    );
  });
});

const FEE = 15000;
const rules = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { level: 3, name: "신청 전에 확인해 주세요" }) });
const refundRow = (page: Page) => rules(page).getByRole("button", { name: "취소·환불 규칙" });
const applySheet = (page: Page) => page.getByRole("dialog", { name: "신청할까요?" });
const cancelSheet = (page: Page) => page.getByRole("dialog", { name: "신청을 취소할까요?" });
const bar = (page: Page) => page.getByRole("region", { name: "신청" });

async function startsAtOf(request: APIRequestContext, id: number): Promise<string> {
  const response = await request.get(`${supabaseUrl}/rest/v1/socialings?select=starts_at&id=eq.${id}`, {
    headers: apiHeaders(),
  });
  const [row] = (await response.json()) as { starts_at: string }[];
  return row.starts_at;
}

async function loginAs(page: Page, user: "A") {
  await page.goto("/login");
  await submitLogin(page, user);
  await expect(page).toHaveURL("/");
}

test.describe("MS12 취소·환불 규칙 화면 (U1)", () => {
  let ids: number[] = [];
  let approval5d: number; // 호스트 승인, 5일 뒤: 세 줄, O02
  let firstCome2d: number; // 선착순, 2일 뒤: 50%부터, A 참여 확정
  let firstCome12h: number; // 선착순, 12시간 뒤: 환불 없음만, A 참여 확정
  let pending5d: number; // 호스트 승인, 5일 뒤, A 승인 대기
  let accepted5d: number; // 선착순, 5일 뒤, A 참여 확정
  let free2d: number; // 0원, A 참여 확정
  let past: number; // 종료, 일시 지남

  test.beforeAll(async () => {
    [approval5d, firstCome2d, firstCome12h, pending5d, accepted5d, free2d, past] = await Promise.all([
      createFixtureSocialing({ host: "B", fee: FEE, joinType: "approval", capacity: 4, deadlineInHours: 100, startsInHours: 120 }),
      createFixtureSocialing({ host: "B", fee: FEE, capacity: 4, deadlineInHours: 40, startsInHours: 48, accepted: ["A"] }),
      createFixtureSocialing({ host: "B", fee: FEE, capacity: 4, deadlineInHours: 6, startsInHours: 12, accepted: ["A"] }),
      createFixtureSocialing({ host: "B", fee: FEE, joinType: "approval", capacity: 4, deadlineInHours: 100, startsInHours: 120 }),
      createFixtureSocialing({ host: "B", fee: FEE, capacity: 4, deadlineInHours: 100, startsInHours: 120, accepted: ["A"] }),
      createFixtureSocialing({ host: "B", capacity: 4, deadlineInHours: 40, startsInHours: 48, accepted: ["A"] }),
      createFixtureSocialing({ host: "B", fee: FEE, status: "completed", deadlineInHours: -48, startsInHours: -24 }),
    ]);
    ids = [approval5d, firstCome2d, firstCome12h, pending5d, accepted5d, free2d, past];
    await addApplication(pending5d, "A", "pending");
  });

  test.afterAll(async () => {
    await deleteFixtureSocialings(ids);
  });

  test("3단계·P03-11: 상세 '취소·환불 규칙'은 처음 접혀 있고, 펼치면 실제 시각 세 줄과 언제든 전액·잠금·데모 안내", async ({
    page,
    request,
  }) => {
    const { full, half } = refundDeadlines(await startsAtOf(request, approval5d));
    await page.goto(`/socialings/${approval5d}`);

    const row = refundRow(page);
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(rules(page).getByText(`${formatDateTime(full)}까지: 전액 환불`)).toBeHidden();

    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    const section = rules(page);
    await expect(section.getByText("참여 확정 뒤 신청을 취소하면")).toBeVisible();
    await expect(section.getByText(`${formatDateTime(full)}까지: 전액 환불`)).toBeVisible();
    await expect(section.getByText(`${formatDateTime(half)}까지: 50% 환불`)).toBeVisible();
    await expect(section.getByText(`${formatDateTime(half)} 뒤: 환불 없음`)).toBeVisible();
    await expect(section.getByText("이럴 때는 언제든 전액 환불")).toBeVisible();
    await expect(section.getByText("승인 전에 신청 취소 · 호스트가 거절 · 호스트 취소 · 최소 인원이 모이지 않아 취소")).toBeVisible();
    await expect(section.getByText("참여 확정자가 생기면 일시·장소·참가비는 바뀌지 않아요")).toBeVisible();
    await expect(section.getByText("결제 기능이 없는 데모예요. 실제 결제와 환불은 일어나지 않아요")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);

    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await expect(section.getByText("참여 확정 뒤 신청을 취소하면")).toBeHidden();
  });

  test("P03-11: 지난 구간 줄은 빠진다 (2일 뒤 = 50%부터, 12시간 뒤 = 환불 없음만), 선착순은 '호스트 취소 · 최소 인원이 모이지 않아 취소'만", async ({
    page,
    request,
  }) => {
    const twoDays = refundDeadlines(await startsAtOf(request, firstCome2d));
    await page.goto(`/socialings/${firstCome2d}`);
    await refundRow(page).click();
    let items = rules(page).locator("ul").nth(1).getByRole("listitem");
    await expect(items).toHaveText([
      `•${formatDateTime(twoDays.half)}까지: 50% 환불`,
      `•${formatDateTime(twoDays.half)} 뒤: 환불 없음`,
    ]);
    await expect(rules(page).locator("ul").nth(2)).toHaveText("•호스트 취소 · 최소 인원이 모이지 않아 취소");

    const halfDay = refundDeadlines(await startsAtOf(request, firstCome12h));
    await page.goto(`/socialings/${firstCome12h}`);
    await refundRow(page).click();
    items = rules(page).locator("ul").nth(1).getByRole("listitem");
    await expect(items).toHaveText([`•${formatDateTime(halfDay.half)} 뒤: 환불 없음`]);
  });

  test("P03-12: 참가비 0원이나 지난 소셜링에는 접는 줄이 없고 규칙 상자만", async ({ page }) => {
    for (const id of [free2d, past]) {
      await page.goto(`/socialings/${id}`);
      await expect(rules(page).getByText("소셜링 규칙", { exact: true })).toBeVisible();
      await expect(refundRow(page)).toHaveCount(0);
    }
  });

  test("4단계·O02: 참가비가 있으면 신청 확인 창에 같은 목록(접지 않음), 320px에서는 창 안이 스크롤된다", async ({
    page,
    request,
  }) => {
    const { full, half } = refundDeadlines(await startsAtOf(request, approval5d));
    await loginAs(page, "A");
    await page.goto(`/socialings/${approval5d}`);
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    const sheet = applySheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("취소·환불 규칙");
    await expect(sheet.getByText(`${formatDateTime(full)}까지: 전액 환불`)).toBeVisible();
    await expect(sheet.getByText(`${formatDateTime(half)}까지: 50% 환불`)).toBeVisible();
    await expect(sheet).toContainText("승인 전에 신청 취소 · 호스트가 거절 · 호스트 취소 · 최소 인원이 모이지 않아 취소");
    await expect(sheet).toContainText("결제 기능이 없는 데모예요. 실제 결제와 환불은 일어나지 않아요");
    await expect(sheet).not.toContainText("플랫폼 공통 환불 규칙");

    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    const submit = sheet.getByRole("button", { name: "신청하기" });
    await expect(submit).toBeInViewport();
    const demo = sheet.getByText("결제 기능이 없는 데모예요. 실제 결제와 환불은 일어나지 않아요");
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toBeInViewport();
    await expect(submit).toBeInViewport();

    await sheet.getByRole("button", { name: "돌아가기" }).click();
    await expect(sheet).toHaveCount(0);
  });

  test("O05: 참가비가 있으면 '지금 취소하면 …' 한 줄 (승인 대기·참여 확정 전액·50%·없음), 0원이면 없음", async ({ page }) => {
    await loginAs(page, "A");
    const cases: [number, string | null][] = [
      [pending5d, "승인 전 취소라 전액 환불 기준이에요"],
      [accepted5d, "지금 취소하면 전액 환불 기준이에요"],
      [firstCome2d, "지금 취소하면 50% 환불 기준이에요"],
      [firstCome12h, "지금 취소하면 환불되지 않는 기준이에요"],
      [free2d, null],
    ];
    for (const [id, line] of cases) {
      await page.goto(`/socialings/${id}`);
      await bar(page).getByRole("button", { name: "신청 취소" }).click();
      const sheet = cancelSheet(page);
      await expect(sheet).toBeVisible();
      if (line) await expect(sheet).toContainText(line);
      else await expect(sheet).not.toContainText("환불");
      // 선착순이면 자리 안내가 먼저, 환불 줄이 다음
      if (id !== pending5d) {
        await expect(sheet).toContainText(
          line ? `취소하면 다른 사람이 자리를 채울 수 있어요.${line}` : "취소하면 다른 사람이 자리를 채울 수 있어요.",
        );
      }
      await sheet.getByRole("button", { name: "돌아가기" }).click();
      await expect(sheet).toHaveCount(0);
    }
  });
});
