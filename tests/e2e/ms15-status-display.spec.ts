import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatDateTime } from "../../lib/format";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS15 U4 상태 표시 (04 2.4·3.1~3.4·3.8, spec 3.1·8.3·8.4·8.5·M4·M7 · DESIGN.md status-badge·status-tag·apply-bar/cancelled
// · screen-cases C03~C10·C14·C15, P03-23~25, P03-B21~23, P06-16·17, O02).
// 보이는 상태는 DB가 계산한다(ms15-display-status-fn). 여기서는 화면이 그 값으로 배지·꼬리표·줄을 고르는지 본다.
// 확정 대기·취소·확정하지 않은 호스트 취소는 지난 신청 마감·확정 기한으로 직접 넣어 만든다(12시간 검사에 걸리지 않음, 04 8.3).
// 호스트 C(하린)의 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Partial<FixtureOptions>) {
  const id = await createFixtureSocialing({ host: "C", capacity: 4, ...options });
  created.push(id);
  return id;
}

/** 신청 마감이 2시간 전에 지났고 확정 기한·일시는 앞 (확정 대기 또는 취소) */
const AFTER_DEADLINE = { deadlineInHours: -2, confirmInHours: 20, startsInHours: 40 } as const;
/** 확정 기한까지 지났고 일시는 앞 (확정하지 않으면 호스트 취소) */
const AFTER_CONFIRM = { deadlineInHours: -30, confirmInHours: -2, startsInHours: 40 } as const;

const detail = (id: number) => `/socialings/${id}`;
const cardOf = (page: Page, href: string) => page.locator("article").filter({ has: page.locator(`a[href="${href}"]`) });
/** 카드 ① 줄: 배지 + 꼬리표 + 신청 칩 */
const pills = (page: Page, href: string) => cardOf(page, href).locator("h2").locator("xpath=preceding-sibling::div[1]");
const main = (page: Page) => page.getByRole("main");
const infoList = (page: Page) => main(page).locator("dl").first();
const infoRow = (page: Page, label: string) =>
  infoList(page).locator(":scope > div").filter({ has: page.locator("dt", { hasText: label }) });
const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const applySheet = (page: Page) => page.getByRole("dialog", { name: "신청할까요?" });

async function timesOf(request: APIRequestContext, id: number) {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialing_summaries?select=starts_at,confirm_deadline_at&id=eq.${id}`,
    { headers: apiHeaders() },
  );
  const [row] = (await response.json()) as { starts_at: string; confirm_deadline_at: string }[];
  return { startsAt: formatDateTime(row.starts_at), confirmAt: formatDateTime(row.confirm_deadline_at) };
}

async function loginAs(page: Page, user: "C" | "P1", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

test.describe("MS15 카드 배지·꼬리표", () => {
  test("C03~C10·C14·C15: 상태 조합 10가지 (탐색 9 + 지난 소셜링 종료·취소·호스트 취소), 새 배지 색", async ({ page }) => {
    const [
      recruiting,
      minNeeded,
      full,
      confirmed,
      confirmedClosed,
      confirmedFull,
      awaiting,
      notConfirmed,
      autoCanceled,
      completedPast,
      autoCanceledPast,
      notConfirmedPast,
    ] = await Promise.all([
      fixture({ minParticipants: 2, accepted: ["P1", "P2"] }),
      fixture({ minParticipants: 3, accepted: ["P1"] }),
      fixture({ capacity: 2, accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", deadlineInHours: -1, accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", capacity: 2, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_CONFIRM, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, accepted: ["P1"] }),
      fixture({ status: "completed", deadlineInHours: -30, startsInHours: -24, accepted: ["P1"] }),
      fixture({ deadlineInHours: -30, startsInHours: -24, accepted: ["P1"] }),
      fixture({ deadlineInHours: -50, confirmInHours: -30, startsInHours: -24, accepted: ["P1", "P2"] }),
    ]);

    await page.goto("/explore");
    const expected: [number, RegExp][] = [
      [recruiting, /^모집중$/],
      [minNeeded, /^모집중\s*최소 인원까지 2명$/],
      [full, /^모집중\s*정원 마감$/],
      [confirmed, /^확정$/],
      [confirmedClosed, /^확정\s*신청 마감$/],
      [confirmedFull, /^확정\s*정원 마감$/],
      [awaiting, /^확정 대기$/],
      [notConfirmed, /^호스트 취소$/],
      [autoCanceled, /^취소$/],
    ];
    for (const [id, text] of expected) {
      await expect(pills(page, detail(id)), `탐색 카드 ${id}`).toHaveText(text);
    }

    // DESIGN.md status-badge/awaiting-confirm: primary-soft 바탕 + primary-strong 글자 / cancelled: danger-soft + danger
    const awaitingBadge = pills(page, detail(awaiting)).getByText("확정 대기", { exact: true });
    await expect(awaitingBadge).toHaveCSS("background-color", "rgb(225, 247, 252)");
    await expect(awaitingBadge).toHaveCSS("color", "rgb(19, 111, 134)");
    const canceledBadge = pills(page, detail(autoCanceled)).getByText("취소", { exact: true });
    await expect(canceledBadge).toHaveCSS("background-color", "rgb(254, 226, 226)");
    await expect(canceledBadge).toHaveCSS("color", "rgb(198, 40, 40)");
    // status-tag/min-needed는 다른 꼬리표와 같은 모양
    const minTag = pills(page, detail(minNeeded)).getByText("최소 인원까지 2명", { exact: true });
    const fullTag = pills(page, detail(full)).getByText("정원 마감", { exact: true });
    for (const property of ["background-color", "color", "height", "border-radius"]) {
      await expect(minTag).toHaveCSS(property, await fullTag.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property));
    }
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    // P02: 지난 소셜링도 같은 배지 (종료 / 최소 인원 미달 취소 / 확정하지 않은 호스트 취소)
    await page.goto("/past");
    await expect(pills(page, detail(completedPast))).toHaveText(/^종료$/);
    await expect(pills(page, detail(autoCanceledPast))).toHaveText(/^취소$/);
    await expect(pills(page, detail(notConfirmedPast))).toHaveText(/^호스트 취소$/);
  });

  test("P00 히어로: 모집중이고 최소 인원 전이면 배지 옆에 '최소 인원까지 N명'", async ({ page, request }) => {
    // 히어로는 지금 신청할 수 있는 가장 가까운 소셜링이라 다른 테스트가 만든 소셜링으로 바뀔 수 있다 → 뷰 값과 함께 맞춘다
    await expect(async () => {
      const response = await request.get(
        `${supabaseUrl}/rest/v1/socialing_summaries?select=title,display_status,status_tag,needed_count&can_apply=eq.true&order=starts_at.asc,id.asc&limit=1`,
        { headers: apiHeaders() },
      );
      const [row] = (await response.json()) as {
        title: string;
        display_status: string;
        status_tag: string | null;
        needed_count: number | null;
      }[];
      await page.goto("/");
      const hero = page.getByRole("region", { name: "지금 신청할 수 있는 가장 가까운 소셜링" });
      await expect(hero.getByRole("heading")).toHaveText(row.title, { timeout: 2000 });
      expect(row.status_tag).toBeNull();
      if (row.display_status === "recruiting" && row.needed_count) {
        await expect(hero.getByText(`최소 인원까지 ${row.needed_count}명`, { exact: true })).toBeVisible({ timeout: 2000 });
      } else {
        await expect(hero).not.toContainText("최소 인원까지");
      }
    }).toPass({ timeout: 30_000 });
  });
});

test.describe("MS15 상세 P03", () => {
  test("P03-23·24·25: 확정 기한 줄과 최소 인원 글은 모집중·확정 대기에만, 390·320px", async ({ page, request }) => {
    const [short, reached, awaiting, confirmed, autoCanceled] = await Promise.all([
      fixture({ minParticipants: 3, staffCount: 1, accepted: ["P1"] }),
      fixture({ minParticipants: 2, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, joinType: "approval", minParticipants: 3, accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, accepted: ["P1"] }),
    ]);
    await addApplication(awaiting, "P3", "pending");

    // 모집중 · 최소 인원 전: 배지 + 꼬리표, 신청 마감 다음 확정 기한 줄 + 보조 글, 인원 아래 "N명 더 모이면"
    const shortTimes = await timesOf(request, short);
    await page.goto(detail(short));
    await expect(main(page).getByText("모집중", { exact: true })).toBeVisible();
    await expect(main(page).getByText("최소 인원까지 2명", { exact: true })).toBeVisible();
    await expect(infoList(page).locator("dt")).toHaveText(["소셜링 일시", "신청 마감", "확정 기한", "장소", "총 참가비", "모집 방식", "인원"]);
    await expect(infoRow(page, "확정 기한").locator("dd").first()).toHaveText(shortTimes.confirmAt);
    await expect(infoRow(page, "확정 기한").locator("dd").nth(1)).toHaveText("이때까지 호스트가 확정하지 않으면 취소돼요");
    // 스태프 보조 글은 그대로, 최소 인원 글은 줄 아래
    await expect(infoRow(page, "인원")).toContainText("참가자 1/4명 · 스태프 1명");
    await expect(infoRow(page, "인원")).toContainText("스태프는 정원에 세지 않아요");
    await expect(infoRow(page, "인원").locator("dd").nth(1)).toHaveText("최소 3명 · 2명 더 모이면 확정할 수 있어요");
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    // 최소 인원이 모임: 꼬리표 없음
    await page.goto(detail(reached));
    await expect(main(page)).not.toContainText("최소 인원까지");
    await expect(infoRow(page, "인원").locator("dd").nth(1)).toHaveText("최소 2명이 모였어요 · 호스트가 확정하면 열려요");

    // 확정 대기 + 승인해야 채워짐: 배지 하나, 확정 기한 줄, "승인 대기 중 1명이 더 승인되면". 신청하지 않은 사람은 13줄 신청 마감
    await page.goto(detail(awaiting));
    // 배지 하나(꼬리표 없음) + 카테고리 줄
    await expect(main(page).locator("h2").first().locator("xpath=preceding-sibling::div[1]")).toHaveText(
      /^확정 대기\s*배움·자기계발 · 술 없음$/,
    );
    await expect(infoRow(page, "확정 기한")).toHaveCount(1);
    await expect(infoRow(page, "인원").locator("dd").nth(1)).toHaveText("최소 3명 · 승인 대기 중 1명이 더 승인되면 확정할 수 있어요");
    await expect(bar(page).getByRole("button", { name: "신청 마감" })).toBeDisabled();
    await expect(bar(page)).toContainText("신청 마감 일시가 지났어요");
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    // 확정·취소: 확정 기한 줄과 최소 인원 글 없음
    for (const id of [confirmed, autoCanceled]) {
      await page.goto(detail(id));
      await expect(infoList(page).locator("dt")).toHaveText(["소셜링 일시", "신청 마감", "장소", "총 참가비", "모집 방식", "인원"]);
      await expect(infoRow(page, "인원").locator("dd")).toHaveCount(1);
      await expect(main(page)).not.toContainText("확정할 수 있어요");
    }
  });

  test("P03-B03·B21·B22: 아래 영역 호스트 취소는 이유로 나뉘고, 최소 인원 미달 취소는 새 줄 (신청자에게도 먼저)", async ({
    page,
  }) => {
    const [hostCanceled, notConfirmed, autoCanceled] = await Promise.all([
      fixture({ status: "canceled", accepted: ["P1"] }),
      fixture({ ...AFTER_CONFIRM, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, minParticipants: 3, accepted: ["P1"] }),
    ]);

    // 비로그인
    await page.goto(detail(hostCanceled));
    await expect(bar(page).getByRole("button", { name: "호스트 취소" })).toBeDisabled();
    await expect(bar(page)).toContainText("호스트가 취소한 소셜링이에요");

    await page.goto(detail(notConfirmed));
    await expect(main(page).getByText("호스트 취소", { exact: true })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "호스트 취소" })).toBeDisabled();
    await expect(bar(page)).toContainText("호스트가 확정 기한까지 확정하지 않아 취소된 소셜링이에요");
    await expect(bar(page).getByRole("link", { name: "다른 소셜링 보기" })).toHaveAttribute("href", "/explore");

    await page.goto(detail(autoCanceled));
    await expect(main(page).getByText("취소", { exact: true })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "취소", exact: true })).toBeDisabled();
    await expect(bar(page)).toContainText("최소 인원(3명)이 모이지 않아 취소된 소셜링이에요");
    await expect(bar(page).getByRole("link", { name: "다른 소셜링 보기" })).toHaveAttribute("href", "/explore");
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    // 참여 확정자(P1)에게도 2·2-1줄이 먼저 (신청 취소 버튼 없음)
    await loginAs(page, "P1", detail(notConfirmed));
    await expect(bar(page)).toContainText("호스트가 확정 기한까지 확정하지 않아 취소된 소셜링이에요");
    await expect(bar(page).getByRole("button", { name: "신청 취소" })).toHaveCount(0);
    await page.goto(detail(autoCanceled));
    await expect(bar(page)).toContainText("최소 인원(3명)이 모이지 않아 취소된 소셜링이에요");
    await expect(bar(page).getByRole("button", { name: "신청 취소" })).toHaveCount(0);
  });

  test("P03-B09·B23: 참여 확정 안내는 확정 소셜링이면 만나는 일시, 모집중·확정 대기면 확정 기한", async ({ page, request }) => {
    const [recruiting, awaiting, confirmed] = await Promise.all([
      fixture({ accepted: ["P1"] }),
      fixture({ ...AFTER_DEADLINE, accepted: ["P1", "P2"] }),
      fixture({ status: "confirmed", accepted: ["P1", "P2"] }),
    ]);
    const [recruitingTimes, awaitingTimes, confirmedTimes] = await Promise.all(
      [recruiting, awaiting, confirmed].map((id) => timesOf(request, id)),
    );

    await loginAs(page, "P1", detail(recruiting));
    await expect(bar(page).getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText(`확정 기한(${recruitingTimes.confirmAt})까지 호스트가 확정하면 열려요`);
    await expect(bar(page).getByRole("button", { name: "신청 취소" })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(detail(awaiting));
    await expect(bar(page)).toContainText(`확정 기한(${awaitingTimes.confirmAt})까지 호스트가 확정하면 열려요`);
    await expect(bar(page).getByRole("button", { name: "신청 취소" })).toBeVisible();

    await page.goto(detail(confirmed));
    await expect(bar(page)).toContainText(`${confirmedTimes.startsAt}에 만나요`);
    await expect(bar(page)).not.toContainText("확정 기한");
  });
});

test.describe("MS15 신청 확인 O02", () => {
  test("O02: 모집중이면 결과 안내 아래 열리는 조건 한 줄(유료는 환불 문장까지), 확정 소셜링에는 없음, 320px에서 버튼까지", async ({
    page,
    request,
  }) => {
    const [paid, free, confirmed] = await Promise.all([
      fixture({ minParticipants: 3, fee: 15000, feeNote: "장소 대여와 음료 값이에요" }),
      fixture({ minParticipants: 2 }),
      fixture({ status: "confirmed", accepted: ["P2", "P3"] }),
    ]);
    const paidTimes = await timesOf(request, paid);
    const freeTimes = await timesOf(request, free);

    await loginAs(page, "P1", detail(paid));
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    const condition = applySheet(page).getByText(/최소 3명이 모이고/);
    await expect(condition).toHaveText(
      `•최소 3명이 모이고 확정 기한(${paidTimes.confirmAt})까지 호스트가 확정하면 열려요. 취소되면 전액 환불 기준이에요`,
    );
    // 결과 안내 바로 아래
    const lines = applySheet(page).locator("p", { hasText: "•" });
    const texts = await lines.allTextContents();
    const resultIndex = texts.findIndex((text) => text.includes("신청하면 바로 참여가 확정돼요"));
    expect(texts[resultIndex + 1]).toContain("최소 3명이 모이고");
    // 환불 목록의 언제든 전액에 최소 인원 미달 취소 (04 2.7)
    await expect(applySheet(page)).toContainText("호스트 취소 · 최소 인원이 모이지 않아 취소");
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await expect(applySheet(page).getByRole("button", { name: "신청하기" })).toBeInViewport();
    await condition.scrollIntoViewIfNeeded();
    await expect(condition).toBeInViewport();
    await page.setViewportSize({ width: 390, height: 844 });
    await applySheet(page).getByRole("button", { name: "돌아가기" }).click();

    await page.goto(detail(free));
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    await expect(applySheet(page).getByText(/최소 2명이 모이고/)).toHaveText(
      `•최소 2명이 모이고 확정 기한(${freeTimes.confirmAt})까지 호스트가 확정하면 열려요`,
    );
    await expect(applySheet(page)).not.toContainText("취소되면 전액 환불 기준이에요");
    await applySheet(page).getByRole("button", { name: "돌아가기" }).click();

    await page.goto(detail(confirmed));
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    await expect(applySheet(page)).toBeVisible();
    await expect(applySheet(page)).not.toContainText("확정 기한");
    await expect(applySheet(page)).not.toContainText("최소");
  });
});

test.describe("MS15 내 소셜링 P06", () => {
  test("P06-16: 신청한 카드는 취소·확정하지 않은 호스트 취소면 배지 하나(칩·거절 사유 없음), 확정 대기는 배지 + 칩", async ({
    page,
  }) => {
    const [awaiting, autoCanceled, notConfirmed, rejectedCanceled] = await Promise.all([
      fixture({ ...AFTER_DEADLINE, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, accepted: ["P1"] }),
      fixture({ ...AFTER_CONFIRM, accepted: ["P1", "P2"] }),
      fixture({ ...AFTER_DEADLINE, joinType: "approval" }),
    ]);
    await addApplication(rejectedCanceled, "P1", "rejected", { reason: "criteria" });

    await loginAs(page, "P1", "/me");
    await expect(pills(page, detail(awaiting))).toHaveText(/^확정 대기\s*참여 확정$/);
    await expect(pills(page, detail(autoCanceled))).toHaveText(/^취소$/);
    await expect(pills(page, detail(notConfirmed))).toHaveText(/^호스트 취소$/);
    await expect(pills(page, detail(rejectedCanceled))).toHaveText(/^취소$/);
    await expect(cardOf(page, detail(rejectedCanceled))).not.toContainText("거절 사유");
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });

  test("P06-17: 호스트 카드의 승인 대기 건수는 확정 대기에 보이고, 취소·호스트 취소에는 숨김", async ({ page }) => {
    const [awaiting, autoCanceled, notConfirmed] = await Promise.all([
      fixture({ ...AFTER_DEADLINE, joinType: "approval", minParticipants: 2, accepted: ["P1"] }),
      fixture({ ...AFTER_DEADLINE, joinType: "approval", minParticipants: 3, accepted: ["P1"] }),
      fixture({ ...AFTER_CONFIRM, joinType: "approval", minParticipants: 2, accepted: ["P1", "P2"] }),
    ]);
    await Promise.all([
      addApplication(awaiting, "P2", "pending"),
      addApplication(autoCanceled, "P2", "pending"),
      addApplication(notConfirmed, "P3", "pending"),
    ]);

    await loginAs(page, "C", "/me?tab=host");
    const manage = (id: number) => `/socialings/${id}/manage`;
    await expect(pills(page, manage(awaiting))).toHaveText(/^확정 대기$/);
    await expect(cardOf(page, manage(awaiting))).toContainText("승인 대기 1");
    await expect(pills(page, manage(autoCanceled))).toHaveText(/^취소$/);
    await expect(cardOf(page, manage(autoCanceled))).not.toContainText("승인 대기");
    await expect(pills(page, manage(notConfirmed))).toHaveText(/^호스트 취소$/);
    await expect(cardOf(page, manage(notConfirmed))).not.toContainText("승인 대기");
  });
});
