import { expect, test, type Page } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
import { seoulInputToIso, toSeoulInput } from "../../lib/format";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { makeJpeg } from "./helpers/photos";
import { deleteFixtureSocialings, deleteTestVenues, venueOf } from "./helpers/supabase";

// MS7 소셜링 등록 P07 (spec M8, 6장, 7장 10단계, 8.6, 8.7 · screen-cases P07-01~13, E02)
// 입력 범위·장소 갈래를 DB가 다시 확인하는 것은 ms7-socialing-functions. 여기서는 화면 동작을 본다.
// 화면으로 만든 소셜링은 제목이 "[E2E]"로 시작하고 테스트 끝에 지운다(외부 장소도 "[E2E]" 이름이라 함께 지운다).

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
  await deleteTestVenues();
});

const NEW_PATH = "/socialings/new";
const tag = () => Math.random().toString(36).slice(2, 8);
/** 날짜·시간 칸 값 (한국 시간, 분까지). 다른 테스트의 "이번 주" 목록에 섞이지 않게 한 달 뒤로 잡는다 */
const inDays = (days: number) => toSeoulInput(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
const DESCRIPTION = "영어 원서 한 챕터를 미리 읽고 와서 인상 깊은 문장을 나눠요.\n처음 오셔도 괜찮아요.";
/** 유료면 참가비 설명이 필수다 (MS14 U3) */
const FEE_NOTE = "원서 복사비 5,000원 + 음료 10,000원. 현장에서 따로 내는 돈은 없어요";

async function loginAs(page: Page, user: "B" | "C", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

// 칸 찾기 -----------------------------------------------------------------------------------------------
const titleField = (page: Page) => page.getByLabel("제목", { exact: true });
const descriptionField = (page: Page) => page.getByRole("textbox", { name: "소개" });
const group = (page: Page, name: string) => page.getByRole("radiogroup", { name });
const pick = (page: Page, groupName: string, option: string) =>
  group(page, groupName).getByText(option, { exact: true }).click();
const branchSelect = (page: Page) => page.getByRole("combobox", { name: "스터디지점" });
const sidoSelect = (page: Page) => page.getByRole("combobox", { name: "시·도" });
const sigunguSelect = (page: Page) => page.getByRole("combobox", { name: "시·군·구" });
const placeNameField = (page: Page) => page.getByLabel("장소 이름");
const startsAtField = (page: Page) => page.getByLabel("소셜링 일시", { exact: true });
const deadlineField = (page: Page) => page.getByLabel("신청 마감 일시", { exact: true });
const feeField = (page: Page) => page.getByLabel("총 참가비");
const feeNoteField = (page: Page) => page.getByRole("textbox", { name: "참가비 설명" });
const capacityField = (page: Page) => page.getByLabel("정원", { exact: true });
const staffField = (page: Page) => page.getByLabel("스태프 인원");
const criteriaField = (page: Page) => page.getByRole("textbox", { name: "승인 기준", exact: true });
const openButton = (page: Page) => page.getByRole("button", { name: "소셜링 열기" });
/** 칸 아래 오류 문구 (FieldMessage) */
const errorOf = (page: Page, field: string) => page.locator(`#field-${field}-error`);
const infoRow = (page: Page, label: string) => page.locator("dl > div").filter({ hasText: label });

/** 스터디지점·선착순·무료가 아닌 기본 입력 (사진·장소 빼고) */
async function fillBasics(page: Page, title: string, times = { startsAt: inDays(30), deadline: inDays(29) }) {
  await titleField(page).fill(title);
  await pick(page, "카테고리", "배움·자기계발");
  await descriptionField(page).fill(DESCRIPTION);
  await startsAtField(page).fill(times.startsAt);
  await deadlineField(page).fill(times.deadline);
  await feeField(page).fill("15000");
  await feeNoteField(page).fill(FEE_NOTE);
  await capacityField(page).fill("6");
  await staffField(page).fill("1");
}

/** 열기 → 상세로 옮겨 가면 id를 지울 목록에 넣고 돌려준다 */
async function openAndTrack(page: Page) {
  await openButton(page).click();
  await expect(page).toHaveURL(/\/socialings\/\d+$/);
  const id = Number(new URL(page.url()).pathname.split("/").pop());
  created.push(id);
  return id;
}

type SavedRow = {
  host_email: string;
  status: string;
  title: string;
  description: string;
  category: string;
  has_alcohol: boolean;
  starts_at: string;
  apply_deadline_at: string;
  fee: number;
  capacity: number;
  staff_count: number;
  join_type: string;
  approval_criteria: string | null;
  cover_photo_path: string | null;
};

async function savedRow(id: number): Promise<SavedRow> {
  const [row] = await runQuery<SavedRow>(`
    select u.email as host_email, s.status, s.title, s.description, c.slug as category, s.has_alcohol,
      s.starts_at, s.apply_deadline_at, s.fee, s.capacity, s.staff_count, s.join_type, s.approval_criteria,
      s.cover_photo_path
    from public.socialings s
    join auth.users u on u.id = s.host_id
    join public.categories c on c.id = s.category_id
    where s.id = ${id};
  `);
  return row;
}

test.describe("MS7 소셜링 등록 P07", () => {
  test("10단계·P07-01·02·03·12: B 내 소셜링 → 새 소셜링 만들기 → 사진·호스트 승인으로 열기 → 상세 + '소셜링을 열었어요' → 뒤로 내 소셜링 → 탐색에 보임", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 원서 한 챕터 읽기 ${tag()}`;
    await loginAs(page, "B", "/me");
    await page.getByRole("navigation").getByRole("link", { name: "호스트인 소셜링" }).click();
    await page.getByRole("link", { name: "새 소셜링 만들기" }).click();
    await expect(page).toHaveURL(NEW_PATH);

    // P07-01: 빈 양식, 술 없음·스터디지점·선착순·스태프 0, 승인 기준 칸 없음
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 등록" })).toBeVisible();
    await expect(titleField(page)).toHaveValue("");
    await expect(titleField(page)).toHaveAttribute("placeholder", "소셜링 제목을 입력해 주세요");
    await expect(group(page, "카테고리").getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(group(page, "술 여부").getByRole("radio", { name: "없음" })).toBeChecked();
    await expect(group(page, "장소").getByRole("radio", { name: "스터디지점" })).toBeChecked();
    await expect(branchSelect(page)).toHaveValue("");
    await expect(group(page, "모집 방식").getByRole("radio", { name: "선착순" })).toBeChecked();
    await expect(staffField(page)).toHaveValue("0");
    await expect(page.getByText("0 / 1000 · 20자 이상")).toBeVisible();
    await expect(criteriaField(page)).toHaveCount(0);
    await expect(openButton(page)).toBeEnabled();

    // P07-02: 호스트 승인을 고르면 승인 기준 칸이 보이고, 선착순으로 돌리면 사라진다
    await pick(page, "모집 방식", "호스트 승인");
    await expect(criteriaField(page)).toBeVisible();
    await pick(page, "모집 방식", "선착순");
    await expect(criteriaField(page)).toHaveCount(0);
    await pick(page, "모집 방식", "호스트 승인");
    // 앞뒤 공백은 세지 않는다 (23자)
    await criteriaField(page).fill("  원서를 한 챕터 미리 읽어 올 수 있는 분  ");
    await expect(page.getByText("23 / 200")).toBeVisible();

    const startsAt = inDays(30);
    const deadline = inDays(29);
    await fillBasics(page, title, { startsAt, deadline });
    await expect(feeField(page)).toHaveValue("15,000");
    await branchSelect(page).selectOption({ label: "홍대점" });
    await expect(page.getByText("서울 마포구 스터디지점")).toBeVisible();

    // P07-03: 사진을 고르면 미리보기
    await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
      name: "cover.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 1200, 900),
    });
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });

    // P07-12: 열면 상세 + 안내
    const id = await openAndTrack(page);
    await expect(page.getByText("소셜링을 열었어요")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByText("모집중", { exact: true })).toBeVisible();
    await expect(main).toContainText("배움·자기계발 · 술 없음");
    await expect(infoRow(page, "장소")).toContainText("스터디지점 홍대점");
    await expect(infoRow(page, "총 참가비")).toContainText("15,000원");
    await expect(infoRow(page, "모집 방식")).toContainText("호스트 승인");
    await expect(infoRow(page, "인원")).toContainText("참가자 0/6명 · 스태프 1명");
    await expect(main).toContainText("원서를 한 챕터 미리 읽어 올 수 있는 분");
    await expect(main.locator("img").first()).toHaveAttribute("src", /socialing-photos/);

    const saved = await savedRow(id);
    expect(saved).toMatchObject({
      host_email: DEMO_USERS.B.email,
      status: "recruiting",
      title,
      description: DESCRIPTION,
      category: "learning",
      has_alcohol: false,
      fee: 15000,
      capacity: 6,
      staff_count: 1,
      join_type: "approval",
      approval_criteria: "원서를 한 챕터 미리 읽어 올 수 있는 분",
    });
    expect(Date.parse(saved.starts_at)).toBe(Date.parse(seoulInputToIso(startsAt)!));
    expect(Date.parse(saved.apply_deadline_at)).toBe(Date.parse(seoulInputToIso(deadline)!));
    expect(saved.cover_photo_path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    expect((await venueOf(id)).name).toBe("홍대점");

    // 뒤로: 양식이 아니라 내 소셜링(호스트인 소셜링)으로, 새 소셜링이 카드로 보인다
    await page.getByRole("button", { name: "뒤로" }).click();
    await expect(page).toHaveURL(/\/me/);
    await expect(page.getByRole("article").filter({ hasText: title })).toBeVisible();

    // P01 탐색 목록에도 보인다
    await page.goto("/explore");
    await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) })).toBeVisible();
  });

  test("P07-04~09: 빈 양식·범위 밖 값으로 열면 칸마다 이유가 보이고 첫 오류 칸으로 가며, 저장되지 않는다", async ({ page }) => {
    const title = `[E2E] 입력 오류 ${tag()}`;
    await loginAs(page, "C", NEW_PATH);
    const expectErrors = async (expected: Record<string, string>) => {
      for (const [field, message] of Object.entries(expected)) await expect(errorOf(page, field)).toHaveText(message);
    };

    // 필수 항목 (P07-04)
    await openButton(page).click();
    await expectErrors({
      title: "제목을 입력해 주세요",
      categoryId: "카테고리를 골라 주세요",
      description: "소개를 20자 이상 써 주세요",
      branchId: "스터디지점을 골라 주세요",
      startsAt: "소셜링 일시를 골라 주세요",
      applyDeadlineAt: "신청 마감 일시를 골라 주세요",
      fee: "총 참가비를 입력해 주세요 (무료면 0)",
      capacity: "정원은 2~20명이에요",
    });
    await expect(errorOf(page, "staffCount")).toHaveCount(0);
    await expect(titleField(page)).toBeFocused();
    await expect(titleField(page)).toHaveAttribute("aria-invalid", "true");

    // 고치면 그 칸의 이유가 사라진다
    await titleField(page).fill("가".repeat(41));
    await expect(errorOf(page, "title")).toHaveCount(0);

    // 글자 수, 지난 일시, 마감 > 일시, 정원·스태프·참가비 범위 (P07-04~09). 앞뒤 공백은 세지 않는다
    await pick(page, "카테고리", "배움·자기계발");
    await descriptionField(page).fill("   짧은 소개글이에요   ");
    await expect(page.getByText("9 / 1000 · 20자 이상")).toBeVisible();
    await branchSelect(page).selectOption({ label: "강남점" });
    await startsAtField(page).fill(toSeoulInput(new Date(Date.now() - 60 * 60 * 1000)));
    await deadlineField(page).fill(inDays(1));
    await feeField(page).fill("1000001");
    await capacityField(page).fill("21");
    await staffField(page).fill("21");
    // 숫자 칸에는 숫자만 들어간다
    await feeField(page).pressSequentially("원-.");
    await expect(feeField(page)).toHaveValue("1,000,001");
    await openButton(page).click();
    await expectErrors({
      title: "제목은 40자까지 쓸 수 있어요",
      description: "소개를 20자 이상 써 주세요",
      startsAt: "소셜링 일시는 지금 이후여야 해요",
      applyDeadlineAt: "신청 마감 일시는 소셜링 일시와 같거나 앞이어야 해요",
      fee: "총 참가비는 0~1,000,000원이에요",
      capacity: "정원은 2~20명이에요",
      staffCount: "스태프 인원은 0~20명이에요",
    });
    await expect(titleField(page)).toBeFocused();

    // 첫 오류 칸은 화면 순서로 정한다
    await titleField(page).fill(title);
    await capacityField(page).fill("1");
    await openButton(page).click();
    await expect(errorOf(page, "capacity")).toHaveText("정원은 2~20명이에요");
    await expect(descriptionField(page)).toBeFocused();

    // 지역 갈래: 시·도 → 시·군·구 → 장소 이름
    await pick(page, "장소", "지역 (시·도 → 구)");
    await expect(sigunguSelect(page)).toBeDisabled();
    await openButton(page).click();
    await expectErrors({ sido: "시·도를 골라 주세요", placeName: "장소 이름을 입력해 주세요" });
    await sidoSelect(page).selectOption("서울특별시");
    await expect(sigunguSelect(page)).toBeEnabled();
    await placeNameField(page).fill("나".repeat(41));
    await openButton(page).click();
    await expectErrors({ regionCode: "시·군·구를 골라 주세요", placeName: "장소 이름은 40자까지 쓸 수 있어요" });

    await expect(page).toHaveURL(NEW_PATH);
    const rows = await runQuery<{ id: number }>(`select id from public.socialings where title = '${title}';`);
    expect(rows).toEqual([]);
  });

  test("P07-10·12: 지역 장소로 쓰다가 새로 고침하면 채워지고, 무료·선착순으로 열면 그 구의 외부 장소가 되며 임시 저장이 지워진다", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 동네 책방 낭독 ${tag()}`;
    const placeName = `[E2E] 연남 작은책방 ${tag()}`;
    await loginAs(page, "C", NEW_PATH);

    await titleField(page).fill(title);
    await pick(page, "카테고리", "배움·자기계발");
    await pick(page, "술 여부", "있음");
    await descriptionField(page).fill(DESCRIPTION);
    await pick(page, "장소", "지역 (시·도 → 구)");
    await sidoSelect(page).selectOption("서울특별시");
    await sigunguSelect(page).selectOption({ label: "마포구" });
    await placeNameField(page).fill(placeName);
    await feeField(page).fill("0");

    // P07-10: 새로 고침해도 글 입력이 남는다
    await page.reload();
    await expect(titleField(page)).toHaveValue(title);
    await expect(group(page, "카테고리").getByRole("radio", { name: "배움·자기계발" })).toBeChecked();
    await expect(group(page, "술 여부").getByRole("radio", { name: "있음" })).toBeChecked();
    await expect(descriptionField(page)).toHaveValue(DESCRIPTION);
    await expect(group(page, "장소").getByRole("radio", { name: "지역 (시·도 → 구)" })).toBeChecked();
    await expect(sidoSelect(page)).toHaveValue("서울특별시");
    await expect(sigunguSelect(page)).toHaveValue("11440");
    await expect(placeNameField(page)).toHaveValue(placeName);
    await expect(feeField(page)).toHaveValue("0");

    await startsAtField(page).fill(inDays(31));
    await deadlineField(page).fill(inDays(31));
    await capacityField(page).fill("4");
    const id = await openAndTrack(page);
    await expect(page.getByText("소셜링을 열었어요")).toBeVisible();
    await expect(infoRow(page, "장소")).toContainText(placeName);
    await expect(infoRow(page, "장소")).toContainText("마포구");
    await expect(infoRow(page, "총 참가비")).toContainText("무료");
    await expect(infoRow(page, "모집 방식")).toContainText("선착순");
    await expect(page.getByRole("main")).toContainText("배움·자기계발 · 술 있음");
    expect(await venueOf(id)).toMatchObject({ type: "external", name: placeName, region_code: "11440" });
    expect(await savedRow(id)).toMatchObject({
      host_email: DEMO_USERS.C.email,
      has_alcohol: true,
      fee: 0,
      capacity: 4,
      staff_count: 0,
      join_type: "first_come",
      approval_criteria: null,
      cover_photo_path: null,
    });

    // 열었으면 임시 저장은 지워져 다음 등록은 빈 양식
    await page.goto(NEW_PATH);
    await expect(titleField(page)).toHaveValue("");
    await expect(group(page, "장소").getByRole("radio", { name: "스터디지점" })).toBeChecked();
  });

  test("P07-11: 저장이 실패하면 입력을 그대로 두고 '다시 시도', 다시 누르면 열린다", async ({ page }) => {
    const title = `[E2E] 저장 실패 뒤 다시 ${tag()}`;
    await loginAs(page, "C", NEW_PATH);
    await fillBasics(page, title);
    await branchSelect(page).selectOption({ label: "성수점" });

    const failing = (route: import("@playwright/test").Route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue();
    await page.route(`**${NEW_PATH}`, failing);
    await openButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "소셜링을 열지 못했어요" })).toHaveText(
      "소셜링을 열지 못했어요. 연결을 확인하고 다시 시도해 주세요",
    );
    await expect(page).toHaveURL(NEW_PATH);
    await expect(titleField(page)).toHaveValue(title);
    await expect(branchSelect(page)).not.toHaveValue("");

    await page.unroute(`**${NEW_PATH}`, failing);
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    created.push(Number(new URL(page.url()).pathname.split("/").pop()));
    await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
  });

  test("P07-13: 사진 올리기가 실패한 채로 열면 사진 없이 저장되고 '수정에서 다시 올려 주세요'", async ({ page }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 사진 실패 ${tag()}`;
    await loginAs(page, "C", NEW_PATH);
    await page.route("**/storage/v1/object/socialing-photos/**", (route) => route.abort("failed"));
    await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
      name: "cover.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 800, 600),
    });
    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "사진 없이 열기" })).toBeVisible();
    await fillBasics(page, title);
    await branchSelect(page).selectOption({ label: "강남점" });

    const id = await openAndTrack(page);
    await expect(page.getByText("사진은 올리지 못했어요. 관리하기 → 수정에서 다시 올려 주세요")).toBeVisible();
    expect((await savedRow(id)).cover_photo_path).toBeNull();
  });

  test("P07-13: 실패 안내에서 '사진 없이 열기'를 눌러도 같은 안내", async ({ page }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 사진 없이 열기 ${tag()}`;
    await loginAs(page, "C", NEW_PATH);
    await page.route("**/storage/v1/object/socialing-photos/**", (route) => route.abort("failed"));
    await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
      name: "cover.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 800, 600),
    });
    await page.getByRole("button", { name: "사진 없이 열기" }).click({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "사진 선택 · 1장" })).toBeVisible();
    await fillBasics(page, title);
    await branchSelect(page).selectOption({ label: "강남점" });

    await openAndTrack(page);
    await expect(page.getByText("사진은 올리지 못했어요. 관리하기 → 수정에서 다시 올려 주세요")).toBeVisible();
  });

  test("E02: 비로그인으로 등록 주소 → 로그인 → 등록 화면으로 돌아온다", async ({ page }) => {
    await page.goto(NEW_PATH);
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(NEW_PATH)}`);
    await submitLogin(page, "C");
    await expect(page).toHaveURL(NEW_PATH);
    await expect(page.getByRole("heading", { level: 1, name: "소셜링 등록" })).toBeVisible();
  });

  test("로딩 스켈레톤, 화면 오류(다시 시도 · 홈으로), 390px·320px 가로 스크롤 없음", async ({ page }) => {
    await loginAs(page, "C", NEW_PATH);
    await page.goto(`${NEW_PATH}?_state=loading`);
    await expect(page.getByRole("status").filter({ hasText: "불러오는 중" })).toBeVisible();
    await page.goto(`${NEW_PATH}?_state=error`);
    await expect(page.getByText("불러오지 못했어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();

    // 칸이 가장 많은 모양: 지역 갈래 + 승인 기준 + 연령 조건(나이 정하기), 오류 문구까지
    await page.goto(NEW_PATH);
    await pick(page, "장소", "지역 (시·도 → 구)");
    await sidoSelect(page).selectOption("경상남도");
    await pick(page, "모집 방식", "호스트 승인");
    await pick(page, "연령 조건 (선택)", "나이 정하기");
    await titleField(page).fill("가나다라마바사아자차카타파하".repeat(4));
    await openButton(page).click();
    await expect(errorOf(page, "title")).toHaveText("제목은 40자까지 쓸 수 있어요");
    await expect(errorOf(page, "minAge")).toHaveText("최소 나이나 최대 나이를 하나 이상 입력해 주세요");
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});
