import { expect, test, type Page } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { DEMO_USERS, type DemoUserKey } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS14 거절 사유 (U10, 03 7장, spec M8·M11·6장·8.4·8.8 · screen-cases O04 거절, P11-23, P06-15, P03-B20)
// 호스트는 O04 거절 창에서 사유 하나 + 덧붙일 말을 남기고, 신청자는 내 소셜링 카드(사유만)와 상세 아래 영역(사유 + 덧붙인 말)에서 본다.
// 사유 검사·권한을 DB가 다시 확인하는 것은 ms14-reject-fn. 여기서는 화면 동작을 본다. 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

const manage = (id: number) => `/socialings/${id}/manage`;
const detail = (id: number) => `/socialings/${id}`;
const list = (page: Page) => page.getByRole("list", { name: "신청자 목록" });
const row = (page: Page, user: DemoUserKey) =>
  list(page).getByRole("listitem").filter({ hasText: DEMO_USERS[user].nickname });
const tabs = (page: Page) => page.getByRole("navigation", { name: "신청자 보기" });
const dialog = (page: Page) => page.getByRole("alertdialog", { name: /신청을 거절할까요\?$/ });
const reason = (page: Page, label: string) =>
  dialog(page).getByRole("radiogroup", { name: "거절 사유" }).getByText(label, { exact: true });
const noteField = (page: Page) => dialog(page).getByRole("textbox", { name: /^덧붙일 말/ });
const rejectButton = (page: Page) => dialog(page).getByRole("button", { name: "거절", exact: true });
const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const card = (page: Page, id: number) => page.locator(`article:has(a[href="${detail(id)}"])`);

const REASONS = ["승인 기준과 맞지 않아요", "정원이 다 찼어요", "호스트 사정으로 함께하기 어려워요", "그 밖의 이유"];
const AGE = "연령 조건과 맞지 않아요";
const CRITERIA = "에세이 한 편을 미리 읽어 올 수 있는 분";

async function loginAs(page: Page, user: DemoUserKey, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

type RejectRow = { status: string; reject_reason: string | null; reject_note: string | null };
async function applicationOf(socialingId: number, user: DemoUserKey): Promise<RejectRow> {
  const rows = await runQuery<RejectRow>(`
    select a.status, a.reject_reason, a.reject_note
    from public.applications a join auth.users u on u.id = a.user_id
    where a.socialing_id = ${socialingId} and u.email = '${DEMO_USERS[user].email}'
    order by a.id desc limit 1;
  `);
  return rows[0];
}

test.describe("MS14 거절 사유 O04·P11", () => {
  test("O04 거절·P11-23: 사유 4개(연령 조건 없음), 사유 없이 → 오류, 그 밖의 이유 + 글 없음 → 오류, 사유 + 덧붙일 말로 거절 → 거절·취소 탭에 사유 한 줄", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", joinType: "approval", approvalCriteria: CRITERIA });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", manage(id));

    await row(page, "P1").getByRole("button", { name: "거절" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole("radio")).toHaveCount(4);
    for (const label of REASONS) await expect(reason(page, label)).toBeVisible();
    await expect(reason(page, AGE)).toHaveCount(0);
    await expect(noteField(page)).toHaveAccessibleName("덧붙일 말 (선택)");
    await expect(dialog(page)).toContainText(
      `${DEMO_USERS.P1.nickname} 님에게 그대로 보여요. 외모나 성별을 이유로 쓰지 마세요`,
    );
    await expect(dialog(page)).toContainText("0 / 100");
    await expect(dialog(page)).toContainText("거절하면 되돌릴 수 없어요.");

    // 사유 없이 → 오류, 첫 사유로 포커스
    await rejectButton(page).click();
    await expect(dialog(page).locator("#field-rejectReason-error")).toHaveText("거절 사유를 골라 주세요");
    await expect(dialog(page).getByRole("radio").first()).toBeFocused();
    // 그 밖의 이유 + 글 없음 → 오류, 칸으로 포커스
    await reason(page, "그 밖의 이유").click();
    await expect(dialog(page).locator("#field-rejectReason-error")).toHaveCount(0);
    await expect(noteField(page)).toHaveAccessibleName("덧붙일 말");
    await noteField(page).fill("   ");
    await rejectButton(page).click();
    await expect(dialog(page).locator("#field-rejectNote-error")).toHaveText("거절 이유를 적어 주세요");
    await expect(noteField(page)).toBeFocused();
    expect((await applicationOf(id, "P1")).status).toBe("pending");

    // 100자 넘으면 오류
    await noteField(page).fill("가".repeat(101));
    await expect(dialog(page)).toContainText("101 / 100");
    await rejectButton(page).click();
    await expect(dialog(page).locator("#field-rejectNote-error")).toHaveText("덧붙일 말은 100자까지 쓸 수 있어요");

    // 사유를 바꾸고 덧붙일 말과 함께 거절
    await reason(page, "승인 기준과 맞지 않아요").click();
    await noteField(page).fill("  이번에는 미리 읽어 올 분들로 모셨어요  ");
    await rejectButton(page).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByTestId("toast")).toHaveText("거절했어요");
    expect(await applicationOf(id, "P1")).toEqual({
      status: "rejected",
      reject_reason: "criteria",
      reject_note: "이번에는 미리 읽어 올 분들로 모셨어요",
    });

    // 거절·취소 탭: 신청 시각 아래 사유 한 줄 (덧붙인 말은 없음)
    await tabs(page).getByRole("link", { name: "거절·취소 1" }).click();
    await expect(row(page, "P1")).toContainText("거절 사유: 승인 기준과 맞지 않아요");
    await expect(row(page, "P1")).not.toContainText("이번에는");
  });

  test("O04 거절·P11-23: 연령 조건이 있으면 사유 5개, '연령 조건과 맞지 않아요'로 거절. 320px에서 창 안만 스크롤되고 버튼이 보인다. 사유 없는 옛 거절은 줄 없음", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", joinType: "approval", approvalCriteria: CRITERIA, minAge: 20, maxAge: 39 });
    await addApplication(id, "P1", "pending");
    await addApplication(id, "P2", "rejected");
    await page.setViewportSize({ width: 320, height: 640 });
    await loginAs(page, "C", manage(id));

    await row(page, "P1").getByRole("button", { name: "거절" }).click();
    await expect(dialog(page).getByRole("radio")).toHaveCount(5);
    await expect(dialog(page).getByRole("radio").nth(1)).toHaveAccessibleName(AGE);
    await expectNoHorizontalScroll(page);
    await expect(rejectButton(page)).toBeInViewport();
    await expect(dialog(page).getByRole("button", { name: "돌아가기" })).toBeInViewport();
    const box = await dialog(page).boundingBox();
    expect(box!.height).toBeLessThanOrEqual(640 * 0.9 + 1);

    await reason(page, AGE).click();
    await rejectButton(page).click();
    await expect(page.getByTestId("toast")).toHaveText("거절했어요");
    expect(await applicationOf(id, "P1")).toEqual({ status: "rejected", reject_reason: "age", reject_note: null });

    await tabs(page).getByRole("link", { name: "거절·취소 2" }).click();
    await expect(row(page, "P1")).toContainText("거절 사유: 연령 조건과 맞지 않아요");
    await expect(row(page, "P2")).toContainText("거절");
    await expect(row(page, "P2")).not.toContainText("거절 사유");
  });
});

test.describe("MS14 거절 사유 신청자 화면 P06·P03", () => {
  test("P06-15·P03-B20: 내 소셜링 카드 아래 '거절 사유: …'(덧붙인 말 없음), 상세 아래 영역은 칩 줄 위에 사유 + 덧붙인 말. 다시 신청하면 사유가 사라진다", async ({
    page,
  }) => {
    const NOTE = "이번에는 미리 읽어 올 분들로 모셨어요. 다음에 함께해요!";
    const [open, closed, old] = await Promise.all([
      fixture({ host: "B", joinType: "approval", approvalCriteria: CRITERIA, capacity: 4 }),
      fixture({ host: "B", joinType: "approval", approvalCriteria: CRITERIA, deadlineInHours: -1 }),
      fixture({ host: "B", joinType: "approval", approvalCriteria: CRITERIA }),
    ]);
    await Promise.all([
      addApplication(open, "P2", "rejected", { reason: "criteria", note: NOTE }),
      addApplication(closed, "P2", "rejected", { reason: "full" }),
      addApplication(old, "P2", "rejected"),
    ]);
    await loginAs(page, "P2", "/me");

    // P06: 거절 칩 + 카드 아래 줄 사유. 덧붙인 말은 상세에서만, 사유 없는 옛 거절은 줄 없음
    await expect(card(page, open)).toContainText("거절 사유: 승인 기준과 맞지 않아요");
    await expect(card(page, open)).not.toContainText(NOTE);
    await expect(card(page, closed)).toContainText("거절 사유: 정원이 다 찼어요");
    await expect(card(page, old)).toContainText("거절");
    await expect(card(page, old)).not.toContainText("거절 사유");
    await expectNoHorizontalScroll(page);

    // P03 9줄: 사유 + 덧붙인 말이 칩 줄 위에, 다시 신청
    await page.goto(detail(open));
    const reasonLine = bar(page).getByText("거절 사유: 승인 기준과 맞지 않아요", { exact: true });
    await expect(reasonLine).toBeVisible();
    await expect(bar(page).getByText(NOTE, { exact: true })).toBeVisible();
    const chipLine = bar(page).getByText("자리가 남아 있어 다시 신청할 수 있어요");
    const [reasonBox, chipBox] = await Promise.all([reasonLine.boundingBox(), chipLine.boundingBox()]);
    expect(reasonBox!.y).toBeLessThan(chipBox!.y);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await expect(bar(page).getByRole("button", { name: "다시 신청" })).toBeInViewport();
    await page.setViewportSize({ width: 390, height: 844 });

    // P03 10줄: 다시 신청할 수 없어도 사유는 보인다
    await page.goto(detail(closed));
    await expect(bar(page)).toContainText("거절 사유: 정원이 다 찼어요");
    await expect(bar(page)).toContainText("신청 마감 일시가 지나 다시 신청할 수 없어요");

    // 사유 없는 옛 거절: 지금 9줄 그대로
    await page.goto(detail(old));
    await expect(bar(page).getByText("거절", { exact: true })).toBeVisible();
    await expect(bar(page)).not.toContainText("거절 사유");

    // 다시 신청하면 가장 최근 신청(승인 대기)이라 사유가 사라진다 (03 7.5)
    await page.goto(detail(open));
    await bar(page).getByRole("button", { name: "다시 신청" }).click();
    await page.getByRole("dialog", { name: "신청할까요?" }).getByRole("button", { name: "신청하기" }).click();
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    await expect(bar(page)).not.toContainText("거절 사유");
    await page.goto("/me");
    await expect(card(page, open)).toContainText("승인 대기");
    await expect(card(page, open)).not.toContainText("거절 사유");
  });

  test("시드: 서윤은 '필름 카메라로 골목 산책' 상세 아래 영역에서 거절 사유와 덧붙인 말을 본다 (03 7.6 F4)", async ({
    page,
    request,
  }) => {
    const response = await request.get(
      `${supabaseUrl}/rest/v1/socialings?select=id&title=eq.${encodeURIComponent("필름 카메라로 골목 산책")}`,
      { headers: apiHeaders() },
    );
    const rows = (await response.json()) as { id: number }[];
    expect(rows, "시드 소셜링 (npm run seed)").toHaveLength(1);
    await loginAs(page, "A", detail(rows[0].id));
    await expect(bar(page)).toContainText("거절 사유: 승인 기준과 맞지 않아요");
    await expect(bar(page)).toContainText("이번에는 사진을 많이 찍어 볼 분들로 모셨어요. 다음에 함께해요!");
  });
});
