import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatMonthDayWeekday } from "../../lib/format";
import { runQuery } from "../../scripts/lib/management-api.mts";
import type { DemoUserKey } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  rpc,
  titleOf,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS15 SH2 나만 보는 참여 기록과 신청 취소 창(O05) 두 줄 (04 3.5·4.3, spec M7·M11·6장·8.6
// · DESIGN.md participation-record·bottom-sheet/confirm-cancel-application · screen-cases P06-18~20, O05).
// 숫자 계산은 get_my_participation_record(ms15-participation-fn), O05 판단은 my_applied_socialings 끝 칸(DB)이 한다.
// 기록 숫자는 다른 테스트와 섞이지 않게 가입시킨 계정으로 본다. O05는 시드 참여자 P2가 [E2E] 소셜링에서 취소한다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

async function newUser(request: APIRequestContext, label: string) {
  const user = await createTestUser(request, label);
  createdUsers.push(user);
  return user;
}

async function fixture(options: Partial<FixtureOptions>) {
  const id = await createFixtureSocialing({ host: "C", capacity: 4, ...options });
  createdSocialings.push(id);
  return id;
}

/** 지난 종료 소셜링 (daysAgo일 전, 신청 마감은 그 하루 전) */
const completedDaysAgo = (daysAgo: number) =>
  ({ status: "completed", deadlineInHours: -(daysAgo + 1) * 24, startsInHours: -daysAgo * 24 }) as const;
/** 신청 마감이 2시간 전에 지났고 확정 기한·일시는 앞 (확정 대기 또는 취소) */
const AFTER_DEADLINE = { deadlineInHours: -2, confirmInHours: 20, startsInHours: 40 } as const;

/** 가입시킨 계정의 신청을 바로 넣는다. 참여 확정이었으면 decided_at, 취소면 canceled_at(지금부터 시간) */
async function addMine(
  socialingId: number,
  user: TestUser,
  status: "accepted" | "canceled",
  at: { decidedHours?: number; canceledHours?: number } = {},
) {
  const time = (hours: number | undefined) => (hours === undefined ? "null" : `now() + interval '${hours} hours'`);
  await runQuery(`
    insert into public.applications (socialing_id, user_id, status, decided_at, canceled_at)
    values (${socialingId}, '${user.id}', '${status}', ${time(at.decidedHours)}, ${time(at.canceledHours)});
  `);
}

type LateCancelRow = { socialing_id: number; canceled_at: string; expires_at: string };
async function lateCancelsOf(request: APIRequestContext, user: TestUser): Promise<LateCancelRow[]> {
  const result = await rpc(request, "get_my_participation_record", {}, user.accessToken);
  expect(result.status).toBe(200);
  return (result.body as unknown as { late_cancels: LateCancelRow[] }[])[0].late_cancels;
}

const record = (page: Page) => page.getByRole("region", { name: "내 참여 기록" });
const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const cancelSheet = (page: Page) => page.getByRole("dialog", { name: "신청을 취소할까요?" });
const CRITERIA = "최근 6개월 · 신청 마감 뒤에 참여 확정을 취소하면 늦은 취소예요";
const AUTO_CANCEL_LINE = (min: number) => `지금 취소하면 최소 인원(${min}명)보다 적어져 소셜링이 취소돼요`;
const LATE_LINE = "지금 취소하면 내 참여 기록에 늦은 취소로 남아요(나만 봐요)";
const FIRST_COME_LINE = "취소하면 다른 사람이 자리를 채울 수 있어요.";

async function loginAs(page: Page, user: DemoUserKey | TestUser, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, typeof user === "string" ? user : { email: user.email, password: user.password });
  await expect(page).toHaveURL(next);
}

test.describe("MS15 내 참여 기록 (P06)", () => {
  test("P06-18·19: 신청한 소셜링 맨 위 '새 멤버 · 참여 2회 · 늦은 취소 1회', 늦은 취소 접는 줄, 호스트에게는 안 보임", async ({
    page,
    request,
  }) => {
    const user = await newUser(request, "record-ui");
    const [first, second, late, upcoming] = await Promise.all([
      fixture(completedDaysAgo(10)),
      fixture(completedDaysAgo(20)),
      fixture(completedDaysAgo(5)),
      fixture({}),
    ]);
    await Promise.all([
      addMine(first, user, "accepted", { decidedHours: -24 * 13 }),
      addMine(second, user, "accepted", { decidedHours: -24 * 23 }),
      // 참여 확정이었다가 신청 마감(6일 전) 뒤에 취소 → 늦은 취소
      addMine(late, user, "canceled", { decidedHours: -24 * 8, canceledHours: -24 * 5 - 12 }),
      addMine(upcoming, user, "accepted", { decidedHours: -1 }),
    ]);
    const lateTitle = await titleOf(late);
    const [lateRow] = await lateCancelsOf(request, user);

    await loginAs(page, user, "/me");
    await expect(record(page)).toContainText("내 참여 기록 · 나만 볼 수 있어요");
    await expect(record(page)).toContainText("새 멤버 · 참여 2회 · 늦은 취소 1회");
    await expect(record(page)).toContainText(CRITERIA);
    // 기록 상자가 목록보다 위
    const recordBox = await record(page).boundingBox();
    const firstCard = await page.locator("article").first().boundingBox();
    expect(recordBox!.y).toBeLessThan(firstCard!.y);

    // P06-19: 접는 줄은 처음엔 접힘, 펼치면 "제목 · 취소한 날 · 기록에서 빠지는 날", 제목은 링크가 아님
    const toggle = record(page).getByRole("button", { name: "늦은 취소 기록 보기" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    const list = record(page).getByRole("list", { name: "늦은 취소 기록" });
    await expect(list).toBeHidden();
    await toggle.click();
    await expect(list.getByRole("listitem")).toHaveText([
      `${lateTitle} · ${formatMonthDayWeekday(lateRow.canceled_at)} 취소 · ${formatMonthDayWeekday(lateRow.expires_at)}에 기록에서 빠져요`,
    ]);
    await expect(record(page).getByRole("link")).toHaveCount(0);
    // 내가 취소한 소셜링은 목록 카드에 없다 (지금 규칙)
    await expect(page.locator(`article:has(a[href="/socialings/${late}"])`)).toHaveCount(0);

    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);

    // 호스트(하린)의 내 소셜링·관리 화면에는 이 사람의 기록이 어디에도 없다
    await page.context().clearCookies();
    await loginAs(page, "C", `/socialings/${late}/manage`);
    await expect(page.getByRole("main")).not.toContainText("늦은 취소");
    await page.goto("/me?tab=host");
    await expect(page.getByRole("main")).not.toContainText("늦은 취소");
  });

  test("P06-18: 참여 3회부터는 '새 멤버'가 없고, 늦은 취소가 없으면 접는 줄도 없다 · 마감 전 취소는 늦은 취소가 아니다", async ({
    page,
    request,
  }) => {
    const user = await newUser(request, "record-member");
    const socialings = await Promise.all([1, 2, 3].map((days) => fixture(completedDaysAgo(days * 7))));
    const early = await fixture(completedDaysAgo(2));
    await Promise.all([
      ...socialings.map((id) => addMine(id, user, "accepted", { decidedHours: -24 * 30 })),
      // 신청 마감(3일 전)보다 앞서 취소 → 늦은 취소 아님
      addMine(early, user, "canceled", { decidedHours: -24 * 6, canceledHours: -24 * 4 }),
    ]);

    await loginAs(page, user, "/me");
    await expect(record(page)).toContainText("참여 3회 · 늦은 취소 0회");
    await expect(record(page)).not.toContainText("새 멤버");
    await expect(record(page).getByRole("button")).toHaveCount(0);
  });

  test("P06-20·08: 기록만 실패하면 그 자리에만 다시 시도, 목록은 그대로 (?_state=partial) · 빈 상태에도 기록 상자", async ({
    page,
  }) => {
    await loginAs(page, "A", "/me");
    await page.goto("/me?_state=partial");
    const failed = page.getByRole("alert").filter({ hasText: "참여 기록을 불러오지 못했어요" });
    await expect(failed).toBeVisible();
    await expect(failed.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(record(page)).toHaveCount(0);
    await expect(page.locator("article").first()).toBeVisible();
    // 실패 자리가 목록보다 위
    expect((await failed.boundingBox())!.y).toBeLessThan((await page.locator("article").first().boundingBox())!.y);

    await page.goto("/me?_state=empty");
    await expect(record(page)).toContainText("새 멤버 · 참여 0회 · 늦은 취소 0회");
    await expect(page.getByText("아직 신청한 소셜링이 없어요")).toBeVisible();
  });
});

test.describe("MS15 신청 취소 창(O05) 두 줄", () => {
  test("O05: 확정 대기에서 내가 취소하면 소셜링이 취소될 때 경고 + 늦은 취소 안내(위 줄 먼저), 마감 뒤라 선착순 자리 안내는 없음 → 취소하면 2-1줄", async ({
    page,
  }) => {
    // 선착순, 최소 2명 = 참여 확정 P1·P2 → 확정 대기. P2가 취소하면 1명 < 2 → 취소(최소 인원 미달)
    const id = await fixture({ joinType: "first_come", ...AFTER_DEADLINE, accepted: ["P1", "P2"] });
    await loginAs(page, "P2", `/socialings/${id}`);
    await bar(page).getByRole("button", { name: "신청 취소" }).click();
    const sheet = cancelSheet(page);
    await expect(sheet).toContainText(`${AUTO_CANCEL_LINE(2)}${LATE_LINE}`);
    await expect(sheet).not.toContainText(FIRST_COME_LINE);

    await sheet.getByRole("button", { name: "신청 취소" }).click();
    await expect(page.getByTestId("toast")).toHaveText("신청을 취소했어요");
    await expect(bar(page).getByRole("button", { name: "취소" })).toBeDisabled();
    await expect(bar(page)).toContainText("최소 인원(2명)이 모이지 않아 취소된 소셜링이에요");
  });

  test("O05: 줄마다 맞는 경우만 (확정 + 마감 뒤 참여 확정 = 늦은 취소만 / 확정 대기 승인 대기 = 경고만 / 마감 전 = 둘 다 없음, 선착순 자리 안내)", async ({
    page,
  }) => {
    const [confirmedAfter, awaitingPending, open] = await Promise.all([
      fixture({ joinType: "first_come", status: "confirmed", deadlineInHours: -2, startsInHours: 40, accepted: ["P1", "P2"] }),
      // 호스트 승인, 참여 확정 P1 + 승인 대기 P2 = 2 → 확정 대기. P2(승인 대기)가 취소하면 1명 < 2
      fixture({ joinType: "approval", ...AFTER_DEADLINE, accepted: ["P1"] }),
      fixture({ joinType: "first_come", accepted: ["P2"] }),
    ]);
    await addApplication(awaitingPending, "P2", "pending");
    await loginAs(page, "P2", `/socialings/${confirmedAfter}`);

    const cases = [
      { id: confirmedAfter, has: [LATE_LINE], not: [AUTO_CANCEL_LINE(2), FIRST_COME_LINE] },
      { id: awaitingPending, has: [AUTO_CANCEL_LINE(2)], not: [LATE_LINE, FIRST_COME_LINE] },
      { id: open, has: [FIRST_COME_LINE], not: [AUTO_CANCEL_LINE(2), LATE_LINE] },
    ];
    for (const { id, has, not } of cases) {
      await page.goto(`/socialings/${id}`);
      await bar(page).getByRole("button", { name: "신청 취소" }).click();
      const sheet = cancelSheet(page);
      await expect(sheet).toBeVisible();
      for (const line of has) await expect(sheet).toContainText(line);
      for (const line of not) await expect(sheet).not.toContainText(line);
      await sheet.getByRole("button", { name: "돌아가기" }).click();
      await expect(sheet).toHaveCount(0);
    }
  });
});
