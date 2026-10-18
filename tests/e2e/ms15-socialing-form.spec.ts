import { expect, test, type Page } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { seoulInputToIso, toSeoulInput } from "../../lib/format";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { createFixtureSocialing, deleteFixtureSocialings, type FixtureOptions } from "./helpers/supabase";

// MS15 U4 등록·수정 양식의 확정 기한·최소 인원 (04 2.2·2.3·3.7, spec M8·6장·8.6 · screen-cases P07-21~25, P08-13~15)
// 함수가 같은 규칙을 다시 보는 것은 ms15-socialing-v3-fn. 여기서는 화면 동작(도움말·칸 오류·잠금·저장)을 본다.
// 호스트 C(하린)로 열고 고친 소셜링은 제목이 "[E2E]"로 시작하고 테스트 끝에 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

const NEW_PATH = "/socialings/new";
const editPath = (id: number) => `/socialings/${id}/edit`;
const managePath = (id: number) => `/socialings/${id}/manage`;
const tag = () => Math.random().toString(36).slice(2, 8);
const HOUR = 60 * 60 * 1000;
/** 날짜·시간 칸 값 (한국 시간, 분까지) */
const inHours = (hours: number) => toSeoulInput(new Date(Date.now() + hours * HOUR));
/** 칸 값에서 몇 시간 앞뒤 */
const shift = (input: string, hours: number) => toSeoulInput(new Date(Date.parse(seoulInputToIso(input)!) + hours * HOUR));
const DESCRIPTION = "자동 테스트가 만들고 지우는 소셜링이에요. 확정 기한과 최소 인원을 확인해요.";
const CONFIRM_HELP = "이때까지 호스트가 확정하지 않으면 취소돼요 · 신청 마감과 같거나 뒤, 소셜링 일시 12시간 전까지";
const MIN_HELP = "이 인원 이상 참여 확정되면 확정할 수 있어요 · 2명~정원";
const ACCEPTED_LOCK = "참여 확정자가 있어 바꿀 수 없어요";

async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host: "C", capacity: 6, description: DESCRIPTION, ...options });
  created.push(id);
  return id;
}

async function loginAs(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, "C");
  await expect(page).toHaveURL(next);
}

type Row = { title: string; apply_deadline_at: string; confirm_deadline_at: string; min_participants: number; capacity: number };
async function rowOf(id: number): Promise<Row> {
  const [row] = await runQuery<Row>(
    `select title, apply_deadline_at, confirm_deadline_at, min_participants, capacity from public.socialings where id = ${id};`,
  );
  return row;
}

// 칸 찾기 -----------------------------------------------------------------------------------------------
const titleField = (page: Page) => page.getByLabel("제목", { exact: true });
const startsAtField = (page: Page) => page.getByLabel("소셜링 일시", { exact: true });
const deadlineField = (page: Page) => page.getByLabel("신청 마감 일시", { exact: true });
const confirmField = (page: Page) => page.getByLabel("확정 기한", { exact: true });
const capacityField = (page: Page) => page.getByLabel("정원", { exact: true });
const minField = (page: Page) => page.getByLabel("최소 인원", { exact: true });
const openButton = (page: Page) => page.getByRole("button", { name: "소셜링 열기" });
const saveButton = (page: Page) => page.getByRole("button", { name: "저장하기" });
const errorOf = (page: Page, field: string) => page.locator(`#field-${field}-error`);

test.describe("MS15 등록 P07: 확정 기한·최소 인원", () => {
  test("P07-21~25: 칸 순서와 도움말, 확정 기한·최소 인원 오류, 경계 값(확정 기한 = 일시 − 12시간)으로 열린다", async ({ page }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 확정 기한 등록 ${tag()}`;
    await loginAs(page, NEW_PATH);

    // 칸 순서: 신청 마감 일시 바로 아래 확정 기한, 정원 바로 아래 최소 인원 (3.7)
    const top = async (field: ReturnType<typeof confirmField>) => (await field.boundingBox())!.y;
    const [deadlineY, confirmY, feeY, capacityY, minY, staffY] = await Promise.all(
      [deadlineField, confirmField, (p: Page) => p.getByLabel("총 참가비"), capacityField, minField, (p: Page) => p.getByLabel("스태프 인원")].map(
        (field) => top(field(page)),
      ),
    );
    expect(deadlineY).toBeLessThan(confirmY);
    expect(confirmY).toBeLessThan(feeY);
    expect(capacityY).toBeLessThan(minY);
    expect(minY).toBeLessThan(staffY);
    await expect(confirmField(page)).toHaveAccessibleDescription(CONFIRM_HELP);
    await expect(minField(page)).toHaveAccessibleDescription(MIN_HELP);

    await titleField(page).fill(title);
    await page.getByRole("radiogroup", { name: "카테고리" }).getByText("취미", { exact: true }).click();
    await page.getByRole("textbox", { name: "소개" }).fill(DESCRIPTION);
    await page.getByRole("combobox", { name: "스터디지점" }).selectOption({ label: "강남점" });
    await page.getByLabel("총 참가비").fill("0");
    await capacityField(page).fill("6");

    // P07-21: 확정 기한이 비었음
    const startsAt = inHours(20 * 24);
    const deadline = shift(startsAt, -48);
    await startsAtField(page).fill(startsAt);
    await deadlineField(page).fill(deadline);
    await openButton(page).click();
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveText("확정 기한을 골라 주세요");
    await expect(confirmField(page)).toBeFocused();

    // P07-22: 신청 마감보다 앞
    await confirmField(page).fill(shift(deadline, -1));
    await openButton(page).click();
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveText("확정 기한은 신청 마감 일시와 같거나 뒤여야 해요");

    // P07-23: 소셜링 일시 12시간 전보다 뒤 (11시간 59분 전)
    await confirmField(page).fill(shift(startsAt, -12 + 1 / 60));
    await openButton(page).click();
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveText("확정 기한은 소셜링 일시보다 12시간 이상 앞이어야 해요");

    // P07-24: 최소 인원 2명 미만, 정원보다 큼
    await confirmField(page).fill(shift(startsAt, -12));
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveCount(0);
    await minField(page).fill("1");
    await openButton(page).click();
    await expect(errorOf(page, "minParticipants")).toHaveText("최소 인원은 2명부터 정원까지예요");
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveCount(0);
    await expect(minField(page)).toBeFocused();
    await minField(page).fill("7");
    await openButton(page).click();
    await expect(errorOf(page, "minParticipants")).toHaveText("최소 인원은 2명부터 정원까지예요");
    await expect(page).toHaveURL(NEW_PATH);

    // 경계 값: 확정 기한 = 소셜링 일시 − 12시간, 최소 인원 = 정원 → 열린다
    await minField(page).fill("6");
    await openButton(page).click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    created.push(id);
    const saved = await rowOf(id);
    expect(saved).toMatchObject({ title, min_participants: 6, capacity: 6 });
    expect(toSeoulInput(saved.confirm_deadline_at)).toBe(shift(startsAt, -12));
    expect(toSeoulInput(saved.apply_deadline_at)).toBe(deadline);
  });

  test("P07-21: 신청 마감 = 확정 기한도 된다, 320px에서도 칸과 도움말이 넘치지 않는다", async ({ page }) => {
    await loginAs(page, NEW_PATH);
    await page.setViewportSize({ width: 320, height: 640 });
    await openButton(page).click();
    await expect(errorOf(page, "confirmDeadlineAt")).toBeVisible();
    await expectNoHorizontalScroll(page);

    const title = `[E2E] 마감과 같은 확정 기한 ${tag()}`;
    const startsAt = inHours(21 * 24);
    await titleField(page).fill(title);
    await page.getByRole("radiogroup", { name: "카테고리" }).getByText("취미", { exact: true }).click();
    await page.getByRole("textbox", { name: "소개" }).fill(DESCRIPTION);
    await page.getByRole("combobox", { name: "스터디지점" }).selectOption({ label: "강남점" });
    await startsAtField(page).fill(startsAt);
    await deadlineField(page).fill(shift(startsAt, -24));
    await confirmField(page).fill(shift(startsAt, -24));
    await page.getByLabel("총 참가비").fill("0");
    await capacityField(page).fill("4");
    await openButton(page).click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    created.push(id);
    const saved = await rowOf(id);
    expect(Date.parse(saved.confirm_deadline_at)).toBe(Date.parse(saved.apply_deadline_at));
    expect(saved.min_participants).toBe(2);
  });
});

test.describe("MS15 수정 P08: 확정 기한·최소 인원", () => {
  test("P08-14: 최소 인원을 그대로 두고 정원을 그 아래로 하면 정원 오류, 둘 다 줄이면 저장된다", async ({ page }) => {
    const id = await fixture({ minParticipants: 4 });
    await loginAs(page, editPath(id));
    await expect(minField(page)).toHaveValue("4");
    await expect(minField(page)).toBeEnabled();

    await capacityField(page).fill("3");
    await saveButton(page).click();
    await expect(errorOf(page, "capacity")).toHaveText("정원은 최소 인원(4명)보다 적게 할 수 없어요");
    await expect(errorOf(page, "minParticipants")).toHaveCount(0);
    await expect(capacityField(page)).toBeFocused();

    // 최소 인원을 고치면 정원 오류가 사라지고, 정원보다 크면 최소 인원 칸 오류
    await minField(page).fill("5");
    await expect(errorOf(page, "capacity")).toHaveCount(0);
    await saveButton(page).click();
    await expect(errorOf(page, "minParticipants")).toHaveText("최소 인원은 2명부터 정원까지예요");

    await minField(page).fill("3");
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect(await rowOf(id)).toMatchObject({ capacity: 3, min_participants: 3 });
  });

  test("P08-15: 세 일시를 그대로 두면 12시간을 보지 않고(MS15 전에 연 소셜링), 일시를 바꾸면 본다", async ({ page }) => {
    // 신청 마감 = 확정 기한이 소셜링 일시 6시간 전 (MS15 전 소셜링처럼 12시간을 못 채움)
    const id = await fixture({ deadlineInHours: 24, startsInHours: 30 });
    const before = await rowOf(id);
    await loginAs(page, editPath(id));
    await expect(confirmField(page)).toHaveValue(toSeoulInput(before.confirm_deadline_at));

    // 신청 마감을 옮기면 확정 기한도 다시 본다
    await deadlineField(page).fill(shift(toSeoulInput(before.apply_deadline_at), -2));
    await saveButton(page).click();
    await expect(errorOf(page, "confirmDeadlineAt")).toHaveText("확정 기한은 소셜링 일시보다 12시간 이상 앞이어야 해요");

    // 되돌리고 제목만 바꾸면 저장된다
    await deadlineField(page).fill(toSeoulInput(before.apply_deadline_at));
    const title = `[E2E] 일시 그대로 ${tag()}`;
    await titleField(page).fill(title);
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    const after = await rowOf(id);
    expect(after.title).toBe(title);
    expect(after.confirm_deadline_at).toBe(before.confirm_deadline_at);
  });

  test("P08-13: 참여 확정자가 있으면 확정 기한·최소 인원이 잠기고, 신청 마감은 확정 기한을 넘을 수 없다", async ({ page }) => {
    const id = await fixture({ deadlineInHours: 24, confirmInHours: 30, startsInHours: 60, accepted: ["P1", "P2"] });
    const before = await rowOf(id);
    await loginAs(page, editPath(id));

    await expect(confirmField(page)).toBeDisabled();
    await expect(confirmField(page)).toHaveAccessibleDescription(ACCEPTED_LOCK);
    await expect(minField(page)).toBeDisabled();
    await expect(minField(page)).toHaveAccessibleDescription(ACCEPTED_LOCK);
    await expect(deadlineField(page)).toBeEnabled();

    // 확정 기한 뒤로 옮기면 신청 마감 칸에 이유
    const confirmInput = toSeoulInput(before.confirm_deadline_at);
    await deadlineField(page).fill(shift(confirmInput, 2));
    await saveButton(page).click();
    await expect(errorOf(page, "applyDeadlineAt")).toHaveText("확정 기한은 신청 마감 일시와 같거나 뒤여야 해요");
    await expect(deadlineField(page)).toBeFocused();

    // 확정 기한까지는 된다
    await deadlineField(page).fill(confirmInput);
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    const after = await rowOf(id);
    expect(toSeoulInput(after.apply_deadline_at)).toBe(confirmInput);
    expect(after.confirm_deadline_at).toBe(before.confirm_deadline_at);
    expect(after.min_participants).toBe(2);
  });

  test("계산으로 취소된 소셜링: 수정 주소는 관리로 보내고, 연 사이 취소되면 저장 대신 관리 + '이미 취소된 소셜링이에요'", async ({
    page,
  }) => {
    // 신청 마감이 지났고 참여 확정 1 < 최소 3 → 취소(계산)
    const canceled = await fixture({ deadlineInHours: -1, confirmInHours: 6, minParticipants: 3, accepted: ["P1"] });
    await loginAs(page, editPath(canceled));
    await expect(page).toHaveURL(managePath(canceled));
    await expect(page.getByText("이미 취소된 소셜링이에요").first()).toBeVisible();

    // 확정 대기(참여 확정 2 = 최소 2)로 연 뒤 한 명이 빠지면 취소(계산)
    const awaiting = await fixture({ deadlineInHours: -1, confirmInHours: 6, accepted: ["P1", "P2"] });
    await page.goto(editPath(awaiting));
    await expect(saveButton(page)).toBeVisible();
    await runQuery(`
      update public.applications set status = 'canceled', canceled_at = now()
      where socialing_id = ${awaiting} and user_id = (select id from auth.users where email = 'taeyun@socialing.test');
    `);
    await titleField(page).fill(`[E2E] 그사이 취소 ${tag()}`);
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(awaiting));
    await expect(page.getByText("이미 취소된 소셜링이에요").first()).toBeVisible();
  });
});
