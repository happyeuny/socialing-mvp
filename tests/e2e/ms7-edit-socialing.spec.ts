import { expect, test, type Page } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { toSeoulInput } from "../../lib/format";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { makeJpeg } from "./helpers/photos";
import {
  addApplication,
  createFixtureSocialing,
  deleteFixtureSocialings,
  deleteTestVenues,
  venueOf,
  type FixtureOptions,
} from "./helpers/supabase";

// MS7 소셜링 수정 P08 (spec M8, 8.6, 8.7 · screen-cases P08-01~09, E05·E06 · tasks MS7 완료 기준 "수정 잠금")
// 잠금·정원 하한을 DB가 다시 확인하는 것은 ms7-socialing-functions. 여기서는 화면 동작을 본다.
// 시드 데이터는 건드리지 않고 호스트 C(하린)의 테스트 소셜링을 쓴다. 바꾼 외부 장소도 "[E2E]" 이름이라 함께 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
  await deleteTestVenues();
});

// 기본 소개(19자)는 등록 규칙(20자 이상)보다 짧아 그대로 저장할 수 없어, 수정 테스트는 20자 이상 소개로 만든다
const DESCRIPTION = "자동 테스트가 만들고 지우는 소셜링이에요. 수정 화면을 확인해요.";

async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host: "C", capacity: 4, description: DESCRIPTION, ...options });
  created.push(id);
  return id;
}

const editPath = (id: number) => `/socialings/${id}/edit`;
const managePath = (id: number) => `/socialings/${id}/manage`;
const tag = () => Math.random().toString(36).slice(2, 8);

async function loginAs(page: Page, user: "A" | "C", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

type Row = {
  title: string;
  starts_at: string;
  apply_deadline_at: string;
  confirm_deadline_at: string;
  min_participants: number;
  fee: number;
  capacity: number;
  join_type: string;
  approval_criteria: string | null;
  cover_photo_path: string | null;
};

async function rowOf(id: number): Promise<Row> {
  const [row] = await runQuery<Row>(`
    select title, starts_at, apply_deadline_at, confirm_deadline_at, min_participants, fee, capacity, join_type,
      approval_criteria, cover_photo_path
    from public.socialings where id = ${id};
  `);
  return row;
}

// 칸 찾기 (등록 테스트와 같은 이름)
const titleField = (page: Page) => page.getByLabel("제목", { exact: true });
const group = (page: Page, name: string) => page.getByRole("radiogroup", { name });
const pick = (page: Page, groupName: string, option: string) =>
  group(page, groupName).getByText(option, { exact: true }).click();
const branchSelect = (page: Page) => page.getByRole("combobox", { name: "스터디지점" });
const sidoSelect = (page: Page) => page.getByRole("combobox", { name: "시·도" });
const sigunguSelect = (page: Page) => page.getByRole("combobox", { name: "시·군·구" });
const placeNameField = (page: Page) => page.getByLabel("장소 이름");
const startsAtField = (page: Page) => page.getByLabel("소셜링 일시", { exact: true });
const deadlineField = (page: Page) => page.getByLabel("신청 마감 일시", { exact: true });
const confirmField = (page: Page) => page.getByLabel("확정 기한", { exact: true });
const minField = (page: Page) => page.getByLabel("최소 인원", { exact: true });
const feeField = (page: Page) => page.getByLabel("총 참가비");
const capacityField = (page: Page) => page.getByLabel("정원", { exact: true });
const criteriaField = (page: Page) => page.getByRole("textbox", { name: "승인 기준", exact: true });
const feeNoteField = (page: Page) => page.getByRole("textbox", { name: "참가비 설명" });
const saveButton = (page: Page) => page.getByRole("button", { name: "저장하기" });
const errorOf = (page: Page, field: string) => page.locator(`#field-${field}-error`);
const lockReason = (page: Page, reason: string) => page.locator("main").getByText(reason, { exact: true });
const ACCEPTED_LOCK = "참여 확정자가 있어 바꿀 수 없어요";
const PENDING_LOCK = "승인 대기 신청이 있어 바꿀 수 없어요";
const inDays = (days: number) => toSeoulInput(new Date(Date.now() + days * 24 * 60 * 60 * 1000));

/** 사진을 고르고 올리기가 끝날 때까지 기다린다 */
async function choosePhoto(page: Page) {
  await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
    name: "cover.jpg",
    mimeType: "image/jpeg",
    buffer: await makeJpeg(page, 800, 600),
  });
}

test.describe("MS7 소셜링 수정 P08", () => {
  test("P08-01·05: 관리 '수정' → 지금 값이 채워진 양식 → 장소·참가비·일시·모집 방식을 바꿔 저장 → 관리 '저장했어요' → 상세에 바뀐 값", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const id = await fixture({ joinType: "approval", approvalCriteria: "영어로 자기소개를 할 수 있는 분", staffCount: 1 });
    const before = await rowOf(id);
    await loginAs(page, "C", managePath(id));
    await page.getByRole("link", { name: "수정", exact: true }).click();
    await expect(page).toHaveURL(editPath(id));

    // P08-01: 지금 값, 잠긴 칸 없음
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 수정" })).toBeVisible();
    await expect(titleField(page)).toHaveValue(before.title);
    await expect(page.getByRole("textbox", { name: "소개" })).toHaveValue(DESCRIPTION);
    await expect(group(page, "카테고리").getByRole("radio", { name: "배움·자기계발" })).toBeChecked();
    await expect(group(page, "술 여부").getByRole("radio", { name: "없음" })).toBeChecked();
    await expect(group(page, "장소").getByRole("radio", { name: "스터디지점" })).toBeChecked();
    await expect(branchSelect(page).locator("option:checked")).toHaveText("강남점");
    await expect(page.getByText("서울 강남구 스터디지점")).toBeVisible();
    await expect(startsAtField(page)).toHaveValue(toSeoulInput(before.starts_at));
    await expect(deadlineField(page)).toHaveValue(toSeoulInput(before.apply_deadline_at));
    await expect(confirmField(page)).toHaveValue(toSeoulInput(before.confirm_deadline_at));
    await expect(minField(page)).toHaveValue("2");
    await expect(feeField(page)).toHaveValue("0");
    await expect(capacityField(page)).toHaveValue("4");
    await expect(page.getByLabel("스태프 인원")).toHaveValue("1");
    await expect(group(page, "모집 방식").getByRole("radio", { name: "호스트 승인" })).toBeChecked();
    await expect(criteriaField(page)).toHaveValue("영어로 자기소개를 할 수 있는 분");
    await expect(page.getByRole("button", { name: "사진 선택 · 1장" })).toBeVisible();
    await expect(lockReason(page, ACCEPTED_LOCK)).toHaveCount(0);
    await expect(lockReason(page, PENDING_LOCK)).toHaveCount(0);
    await expect(startsAtField(page)).toBeEnabled();

    // 바꾸기: 제목, 지역 장소, 참가비, 일시·마감·확정 기한, 정원·최소 인원, 선착순
    const title = `[E2E] 바꾼 제목 ${tag()}`;
    const placeName = `[E2E] 망원 작은 서재 ${tag()}`;
    const startsAt = inDays(5);
    const deadline = inDays(4);
    await titleField(page).fill(title);
    await pick(page, "장소", "지역 (시·도 → 구)");
    await sidoSelect(page).selectOption("서울특별시");
    await sigunguSelect(page).selectOption({ label: "마포구" });
    await placeNameField(page).fill(placeName);
    await startsAtField(page).fill(startsAt);
    await deadlineField(page).fill(deadline);
    // 확정 기한은 신청 마감과 같거나 뒤여야 해서 같이 옮긴다 (MS15)
    await confirmField(page).fill(deadline);
    await feeField(page).fill("20000");
    // 유료면 참가비 설명이 필수다 (MS14 U3)
    await feeNoteField(page).fill("교재 복사비와 음료 값이에요");
    await capacityField(page).fill("6");
    await minField(page).fill("3");
    await pick(page, "모집 방식", "선착순");
    await saveButton(page).click();

    // P08-05: 관리 + "저장했어요"
    await expect(page).toHaveURL(managePath(id));
    await expect(page.getByText("저장했어요")).toBeVisible();
    await expect(page.getByRole("main")).toContainText(title);
    const after = await rowOf(id);
    expect(after).toMatchObject({
      title,
      fee: 20000,
      capacity: 6,
      min_participants: 3,
      join_type: "first_come",
      approval_criteria: null,
    });
    expect(toSeoulInput(after.starts_at)).toBe(startsAt);
    expect(toSeoulInput(after.apply_deadline_at)).toBe(deadline);
    expect(toSeoulInput(after.confirm_deadline_at)).toBe(deadline);
    expect(await venueOf(id)).toMatchObject({ type: "external", name: placeName, region_code: "11440" });

    // 상세에 바뀐 값
    await page.getByRole("link", { name: "상세 보기" }).click();
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    const infoRow = (label: string) => page.locator("dl > div").filter({ hasText: label });
    await expect(infoRow("장소")).toContainText(placeName);
    await expect(infoRow("총 참가비")).toContainText("20,000원");
    await expect(infoRow("모집 방식")).toContainText("선착순");
  });

  test("수정 잠금(완료 기준)·P08-02·03: 참여 확정자가 있으면 일시·장소·총 참가비가 잠기고, 정원을 참여 확정 인원 아래로 하면 오류", async ({
    page,
  }) => {
    const id = await fixture({ capacity: 4, accepted: ["A", "P1", "P2"] });
    const before = await rowOf(id);
    await loginAs(page, "C", editPath(id));

    // P08-02·13: 잠긴 칸은 지금 값 + 자물쇠와 이유 (장소 · 일시 · 확정 기한 · 참가비 · 최소 인원 다섯 곳, MS15에서 둘 더함)
    await expect(lockReason(page, ACCEPTED_LOCK)).toHaveCount(5);
    await expect(confirmField(page)).toBeDisabled();
    await expect(confirmField(page)).toHaveValue(toSeoulInput(before.confirm_deadline_at));
    await expect(minField(page)).toBeDisabled();
    await expect(minField(page)).toHaveValue("2");
    await expect(startsAtField(page)).toBeDisabled();
    await expect(startsAtField(page)).toHaveValue(toSeoulInput(before.starts_at));
    await expect(feeField(page)).toBeDisabled();
    await expect(branchSelect(page)).toBeDisabled();
    await expect(group(page, "장소").getByRole("radio", { name: "지역 (시·도 → 구)" })).toBeDisabled();
    await expect(startsAtField(page)).toHaveAccessibleDescription(ACCEPTED_LOCK);
    // 잠기지 않은 칸
    await expect(titleField(page)).toBeEnabled();
    await expect(deadlineField(page)).toBeEnabled();
    await expect(group(page, "모집 방식").getByRole("radio", { name: "호스트 승인" })).toBeEnabled();
    await expect(page.getByText("2~20명 · 참여 확정 3명보다 적게 할 수 없어요")).toBeVisible();

    // P08-03: 정원 < 참여 확정 인원 → 오류, 저장되지 않음
    await capacityField(page).fill("2");
    await saveButton(page).click();
    await expect(errorOf(page, "capacity")).toHaveText("참여 확정 인원(3명)보다 적게 할 수 없어요");
    await expect(capacityField(page)).toBeFocused();
    await expect(page).toHaveURL(editPath(id));
    expect((await rowOf(id)).capacity).toBe(4);

    // 정원 = 참여 확정 인원은 된다. 잠긴 칸은 그대로 저장된다
    await capacityField(page).fill("3");
    await titleField(page).fill(`[E2E] 잠금 확인 ${tag()}`);
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    await expect(page.getByText("저장했어요")).toBeVisible();
    const after = await rowOf(id);
    expect(after.capacity).toBe(3);
    expect(after.fee).toBe(before.fee);
    expect(toSeoulInput(after.starts_at)).toBe(toSeoulInput(before.starts_at));
  });

  test("P08-08: 승인 대기 신청이 있으면 모집 방식이 잠긴다 (일시·장소·참가비는 열림)", async ({ page }) => {
    const id = await fixture({ joinType: "approval" });
    await addApplication(id, "A", "pending");
    await loginAs(page, "C", editPath(id));

    await expect(lockReason(page, PENDING_LOCK)).toBeVisible();
    await expect(group(page, "모집 방식").getByRole("radio", { name: "선착순" })).toBeDisabled();
    await expect(group(page, "모집 방식").getByRole("radio", { name: "호스트 승인" })).toBeChecked();
    await expect(group(page, "모집 방식")).toHaveAccessibleDescription(PENDING_LOCK);
    await expect(criteriaField(page)).toBeEnabled();
    await expect(lockReason(page, ACCEPTED_LOCK)).toHaveCount(0);
    await expect(startsAtField(page)).toBeEnabled();
    await expect(feeField(page)).toBeEnabled();
  });

  test("P08-09: 그사이 참여 확정자가 생기면 결과 창 → 확인 → 잠긴 칸이 지금 값으로 돌아가고, 다시 저장하면 다른 칸은 저장된다", async ({
    page,
  }) => {
    const id = await fixture();
    await loginAs(page, "C", editPath(id));
    const title = `[E2E] 그사이 확정 ${tag()}`;
    await titleField(page).fill(title);
    await feeField(page).fill("30000");
    await feeNoteField(page).fill("장소 대여비예요");
    await addApplication(id, "A", "accepted");

    await saveButton(page).click();
    const dialog = page.getByRole("alertdialog", { name: "저장하지 못했어요" });
    await expect(dialog).toContainText("그사이 참여 확정자나 승인 대기 신청이 생겨 바꿀 수 없는 칸이 있어요");
    await dialog.getByRole("button", { name: "확인" }).click();
    await expect(dialog).toBeHidden();
    await expect(feeField(page)).toBeDisabled();
    await expect(feeField(page)).toHaveValue("0");
    await expect(titleField(page)).toHaveValue(title);
    expect((await rowOf(id)).fee).toBe(0);

    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect(await rowOf(id)).toMatchObject({ title, fee: 0 });
  });

  test("P08-04: 대표 사진을 넣고, 지우고 다시 골라 바꾼다", async ({ page }) => {
    test.setTimeout(90_000);
    const id = await fixture();
    await loginAs(page, "C", editPath(id));

    await choosePhoto(page);
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    const first = (await rowOf(id)).cover_photo_path;
    expect(first).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);

    // 다시 열면 지금 사진이 보이고, 지우고 새로 고르면 바뀐다
    await page.goto(editPath(id));
    await expect(page.getByRole("img", { name: "지금 대표 사진" })).toHaveAttribute("src", new RegExp(first!));
    await page.getByRole("button", { name: "사진 지우기" }).click();
    await choosePhoto(page);
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    const second = (await rowOf(id)).cover_photo_path;
    expect(second).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    expect(second).not.toBe(first);

    // 상세에 새 사진
    await page.goto(`/socialings/${id}`);
    await expect(page.getByRole("main").locator("img").first()).toHaveAttribute("src", new RegExp(second!));
  });

  test("P08-04: 새 사진 올리기가 실패하면 저장된 사진은 그대로, '사진 없이 저장'을 누르면 사진을 지운다", async ({ page }) => {
    test.setTimeout(90_000);
    const id = await fixture();
    await loginAs(page, "C", editPath(id));
    await choosePhoto(page);
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    const saved = (await rowOf(id)).cover_photo_path;
    expect(saved).not.toBeNull();

    // 실패한 채로 저장 → 사진은 그대로
    await page.goto(editPath(id));
    await page.route("**/storage/v1/object/socialing-photos/**", (route) => route.abort("failed"));
    await page.getByRole("button", { name: "사진 지우기" }).click();
    await choosePhoto(page);
    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect((await rowOf(id)).cover_photo_path).toBe(saved);

    // "사진 없이 저장" → 사진을 지운다
    await page.goto(editPath(id));
    await page.getByRole("button", { name: "사진 지우기" }).click();
    await choosePhoto(page);
    await page.getByRole("button", { name: "사진 없이 저장" }).click({ timeout: 30_000 });
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect((await rowOf(id)).cover_photo_path).toBeNull();
  });

  test("E05·E06: 호스트가 아니면 상세 + '호스트만 볼 수 있어요', 종료·호스트 취소면 관리 + 이유, 없는 소셜링", async ({
    page,
  }) => {
    const [open, completed, canceled] = await Promise.all([
      fixture(),
      fixture({ status: "completed", deadlineInHours: -26, startsInHours: -25 }),
      fixture({ status: "canceled" }),
    ]);

    await loginAs(page, "A", "/me");
    await page.goto(editPath(open));
    await expect(page).toHaveURL(`/socialings/${open}`);
    await expect(page.getByText("호스트만 볼 수 있어요")).toBeVisible();

    await page.context().clearCookies();
    await loginAs(page, "C", "/me");
    await page.goto(editPath(completed));
    // 안내를 띄운 뒤 주소의 notice는 지워진다 (새로 고침해도 다시 뜨지 않게)
    await expect(page).toHaveURL(managePath(completed));
    await expect(page.getByText("종료한 소셜링은 수정할 수 없어요")).toBeVisible();

    await page.goto(editPath(canceled));
    await expect(page).toHaveURL(managePath(canceled));
    await expect(page.getByText("호스트 취소한 소셜링은 수정할 수 없어요")).toBeVisible();

    await page.goto(editPath(999_999_999));
    await expect(page.getByText("찾을 수 없는 소셜링이에요")).toBeVisible();
  });

  test("E02: 비로그인으로 수정 주소 → 로그인 → 수정 화면으로 돌아온다", async ({ page }) => {
    const id = await fixture();
    await page.goto(editPath(id));
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(editPath(id))}`);
    await submitLogin(page, "C");
    await expect(page).toHaveURL(editPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 수정" })).toBeVisible();
  });

  test("P08-06·07: 로딩 스켈레톤, 화면 오류, 잠긴 칸이 있어도 390px·320px 가로 스크롤 없음", async ({ page }) => {
    const id = await fixture({ joinType: "approval", accepted: ["A"] });
    await addApplication(id, "P1", "pending");
    await loginAs(page, "C", editPath(id));
    await expect(lockReason(page, PENDING_LOCK)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);

    await page.goto(`${editPath(id)}?_state=loading`);
    await expect(page.getByRole("status").filter({ hasText: "불러오는 중" })).toBeVisible();
    await page.goto(`${editPath(id)}?_state=error`);
    await expect(page.getByText("불러오지 못했어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
  });
});
