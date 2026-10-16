import { expect, test, type Page } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { toSeoulInput } from "../../lib/format";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { createFixtureSocialing, deleteFixtureSocialings, type FixtureOptions } from "./helpers/supabase";

// MS14 등록·수정 양식의 새 칸 (03 2.1·3.2·5.2·6.2·8.2, spec M8·6장·8.6 P07·P08 · screen-cases P07-14~17, P08-10~12)
// 참가비 설명(U3, 유료면 필수·참여 확정 뒤 잠금), 승인 기준 필수(U5), 연령 조건(SH1b, 호스트 승인만), 자료 링크(SH3).
// 같은 규칙을 DB가 다시 확인하는 것은 ms14-socialing-v2-fn. 여기서는 화면 동작을 본다.
// 화면으로 만든 소셜링은 제목이 "[E2E]"로 시작하고 테스트 끝에 지운다. 수정은 호스트 C(하린)의 테스트 소셜링을 쓴다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({
    host: "C",
    capacity: 4,
    description: "자동 테스트가 만들고 지우는 소셜링이에요. 새 칸을 확인해요.",
    ...options,
  });
  created.push(id);
  return id;
}

const NEW_PATH = "/socialings/new";
const editPath = (id: number) => `/socialings/${id}/edit`;
const managePath = (id: number) => `/socialings/${id}/manage`;
const tag = () => Math.random().toString(36).slice(2, 8);
const inDays = (days: number) => toSeoulInput(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
const MATERIAL_URL = "https://ko.wikipedia.org/wiki/%EC%88%98%ED%95%84";
const FEE_NOTE = "장소 대여 10,000원 + 음료 5,000원. 현장에서 따로 내는 돈은 없어요";
const CRITERIA = "에세이 한 편을 미리 읽어 올 수 있는 분이면 좋아요";

async function loginAs(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, "C");
  await expect(page).toHaveURL(next);
}

// 칸 찾기 (등록·수정 테스트와 같은 이름)
const group = (page: Page, name: string) => page.getByRole("radiogroup", { name });
const pick = (page: Page, groupName: string, option: string) =>
  group(page, groupName).getByText(option, { exact: true }).click();
const titleField = (page: Page) => page.getByLabel("제목", { exact: true });
const materialField = (page: Page) => page.getByRole("textbox", { name: "자료 링크 (선택)" });
const feeField = (page: Page) => page.getByLabel("총 참가비");
const feeNoteField = (page: Page) => page.getByRole("textbox", { name: "참가비 설명" });
const criteriaField = (page: Page) => page.getByRole("textbox", { name: "승인 기준", exact: true });
const ageGroup = (page: Page) => group(page, "연령 조건 (선택)");
const minAgeField = (page: Page) => page.getByRole("textbox", { name: "최소 나이" });
const maxAgeField = (page: Page) => page.getByRole("textbox", { name: "최대 나이" });
const openButton = (page: Page) => page.getByRole("button", { name: "소셜링 열기" });
const saveButton = (page: Page) => page.getByRole("button", { name: "저장하기" });
const errorOf = (page: Page, field: string) => page.locator(`#field-${field}-error`);
const ACCEPTED_LOCK = "참여 확정자가 있어 바꿀 수 없어요";
const lockReason = (page: Page) => page.locator("main").getByText(ACCEPTED_LOCK, { exact: true });

type Row = {
  title: string;
  fee: number;
  fee_note: string | null;
  join_type: string;
  approval_criteria: string | null;
  min_age: number | null;
  max_age: number | null;
  material_url: string | null;
};

async function rowOf(id: number): Promise<Row> {
  const [row] = await runQuery<Row>(`
    select title, fee, fee_note, join_type, approval_criteria, min_age, max_age, material_url
    from public.socialings where id = ${id};
  `);
  return row;
}

async function rowByTitle(title: string): Promise<(Row & { id: number }) | undefined> {
  const [row] = await runQuery<Row & { id: number }>(`
    select id, title, fee, fee_note, join_type, approval_criteria, min_age, max_age, material_url
    from public.socialings where title = '${title}';
  `);
  return row;
}

test.describe("MS14 소셜링 등록 P07 새 칸", () => {
  test("P07-14~17: 자료 링크·참가비 설명·승인 기준·연령 조건의 자리와 오류 → 고쳐서 열면 저장, 쓰는 중 새로 고침해도 남는다", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const title = `[E2E] 에세이 한 편 읽기 ${tag()}`;
    await loginAs(page, NEW_PATH);

    // 빈 양식: 자료 링크·참가비 설명은 처음부터, 연령 조건은 호스트 승인일 때만
    await expect(materialField(page)).toHaveValue("");
    await expect(materialField(page)).toHaveAttribute("placeholder", "https://…");
    await expect(materialField(page)).toHaveAccessibleDescription(
      "신청 전에 누구나 볼 수 있어요. 미리 읽을 자료 주소를 넣어 주세요",
    );
    await expect(feeNoteField(page)).toHaveAttribute(
      "placeholder",
      "예: 장소 대여 10,000원 + 음료 5,000원. 현장에서 따로 내는 돈은 없어요",
    );
    await expect(feeNoteField(page)).toHaveAttribute("maxlength", "100");
    await expect(page.getByText("무엇에 쓰는 돈인지, 현장에서 따로 내는 돈이 있는지 적어 주세요")).toBeVisible();
    await expect(page.getByText("0 / 100", { exact: true })).toBeVisible();
    await expect(ageGroup(page)).toHaveCount(0);

    // 호스트 승인: 승인 기준(필수, 도움말)과 연령 조건(기본 제한 없음)이 보인다
    await pick(page, "모집 방식", "호스트 승인");
    await expect(criteriaField(page)).toBeVisible();
    await expect(page.getByText("신청하기 전에 누구나 볼 수 있어요", { exact: true })).toBeVisible();
    await expect(ageGroup(page).getByRole("radio", { name: "제한 없음" })).toBeChecked();
    await expect(minAgeField(page)).toHaveCount(0);
    await pick(page, "연령 조건 (선택)", "나이 정하기");
    await expect(minAgeField(page)).toBeVisible();
    await expect(page.getByText("만 나이로 적어 주세요")).toBeVisible();

    // 나머지 칸을 채우고, 새 칸은 비우거나 틀리게 둔다
    await titleField(page).fill(title);
    await pick(page, "카테고리", "배움·자기계발");
    await page.getByRole("textbox", { name: "소개" }).fill("이번 달 에세이 한 편을 읽고 와서 좋았던 문장을 나눠요.");
    await page.getByRole("combobox", { name: "스터디지점" }).selectOption({ label: "홍대점" });
    await page.getByLabel("소셜링 일시", { exact: true }).fill(inDays(30));
    await page.getByLabel("신청 마감 일시", { exact: true }).fill(inDays(29));
    await feeField(page).fill("15000");
    await page.getByLabel("정원", { exact: true }).fill("6");
    await materialField(page).fill("http://ko.wikipedia.org/wiki/수필");
    await criteriaField(page).fill("   ");
    await openButton(page).click();
    await expect(errorOf(page, "materialUrl")).toHaveText("https://로 시작하는 주소를 넣어 주세요");
    await expect(errorOf(page, "feeNote")).toHaveText("참가비 설명을 입력해 주세요");
    await expect(errorOf(page, "approvalCriteria")).toHaveText("승인 기준을 입력해 주세요");
    await expect(errorOf(page, "minAge")).toHaveText("최소 나이나 최대 나이를 하나 이상 입력해 주세요");
    // 첫 오류 칸(화면 순서: 소개 다음 자료 링크)으로 간다
    await expect(materialField(page)).toBeFocused();
    await expect(feeNoteField(page)).toHaveAccessibleDescription(/참가비 설명을 입력해 주세요/);

    // 나이 범위
    await minAgeField(page).fill("0");
    await openButton(page).click();
    await expect(errorOf(page, "minAge")).toHaveText("나이는 1~99세예요");
    await minAgeField(page).fill("40");
    await maxAgeField(page).fill("39");
    await openButton(page).click();
    await expect(errorOf(page, "minAge")).toHaveText("최소 나이가 최대 나이보다 클 수 없어요");
    await expect(page).toHaveURL(NEW_PATH);
    expect(await rowByTitle(title)).toBeUndefined();

    // 고치기. 무료로 바꾸면 참가비 설명은 선택이 된다
    await feeField(page).fill("0");
    await expect(errorOf(page, "feeNote")).toHaveCount(0);
    await feeField(page).fill("15000");
    await feeNoteField(page).fill(`  ${FEE_NOTE}  `);
    await expect(page.getByText(`${Array.from(FEE_NOTE).length} / 100`, { exact: true })).toBeVisible();
    await materialField(page).fill(MATERIAL_URL);
    await criteriaField(page).fill(CRITERIA);
    await minAgeField(page).fill("20");

    // 새로 고침해도 새 칸이 남는다 (임시 저장)
    await page.reload();
    await expect(materialField(page)).toHaveValue(MATERIAL_URL);
    await expect(feeNoteField(page)).toHaveValue(`  ${FEE_NOTE}  `);
    await expect(criteriaField(page)).toHaveValue(CRITERIA);
    await expect(ageGroup(page).getByRole("radio", { name: "나이 정하기" })).toBeChecked();
    await expect(minAgeField(page)).toHaveValue("20");
    await expect(maxAgeField(page)).toHaveValue("39");

    await openButton(page).click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    created.push(id);
    expect(await rowOf(id)).toMatchObject({
      title,
      fee: 15000,
      fee_note: FEE_NOTE,
      join_type: "approval",
      approval_criteria: CRITERIA,
      min_age: 20,
      max_age: 39,
      material_url: MATERIAL_URL,
    });
  });

  test("선착순으로 열면 연령 조건은 저장되지 않고, 무료면 참가비 설명 없이 열린다", async ({ page }) => {
    const title = `[E2E] 선착순 연령 지움 ${tag()}`;
    await loginAs(page, NEW_PATH);
    await titleField(page).fill(title);
    await pick(page, "카테고리", "배움·자기계발");
    await page.getByRole("textbox", { name: "소개" }).fill("무료로 열고 연령 조건은 선착순이라 남지 않아요.");
    await page.getByRole("combobox", { name: "스터디지점" }).selectOption({ label: "강남점" });
    await page.getByLabel("소셜링 일시", { exact: true }).fill(inDays(32));
    await page.getByLabel("신청 마감 일시", { exact: true }).fill(inDays(31));
    await feeField(page).fill("0");
    await page.getByLabel("정원", { exact: true }).fill("4");
    await pick(page, "모집 방식", "호스트 승인");
    await pick(page, "연령 조건 (선택)", "나이 정하기");
    await maxAgeField(page).fill("39");
    await pick(page, "모집 방식", "선착순");
    await expect(ageGroup(page)).toHaveCount(0);

    await openButton(page).click();
    await expect(page).toHaveURL(/\/socialings\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").pop());
    created.push(id);
    expect(await rowOf(id)).toMatchObject({
      fee: 0,
      fee_note: null,
      join_type: "first_come",
      approval_criteria: null,
      min_age: null,
      max_age: null,
      material_url: null,
    });
  });
});

test.describe("MS14 소셜링 수정 P08 새 칸", () => {
  test("P08-10·11: 지금 값이 채워지고, 기준 없이 열린 호스트 승인은 기준을 채워야 저장, 선착순으로 바꾸면 연령 조건이 지워진다", async ({
    page,
  }) => {
    const id = await fixture({
      joinType: "approval",
      fee: 15000,
      feeNote: FEE_NOTE,
      minAge: 20,
      maxAge: 39,
      materialUrl: MATERIAL_URL,
    });
    await loginAs(page, editPath(id));

    await expect(materialField(page)).toHaveValue(MATERIAL_URL);
    await expect(feeNoteField(page)).toHaveValue(FEE_NOTE);
    await expect(criteriaField(page)).toHaveValue("");
    await expect(ageGroup(page).getByRole("radio", { name: "나이 정하기" })).toBeChecked();
    await expect(minAgeField(page)).toHaveValue("20");
    await expect(maxAgeField(page)).toHaveValue("39");

    // P08-10: MS14 전에 기준 없이 연 호스트 승인 → 기준을 채워야 저장된다
    await saveButton(page).click();
    await expect(errorOf(page, "approvalCriteria")).toHaveText("승인 기준을 입력해 주세요");
    await expect(criteriaField(page)).toBeFocused();
    await criteriaField(page).fill(CRITERIA);
    await minAgeField(page).fill("");
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect(await rowOf(id)).toMatchObject({ approval_criteria: CRITERIA, min_age: null, max_age: 39 });

    // P08-11: 선착순으로 바꾸면 승인 기준과 연령 조건이 지워진다. 자료 링크는 비우면 지워진다
    await page.goto(editPath(id));
    await expect(maxAgeField(page)).toHaveValue("39");
    await pick(page, "모집 방식", "선착순");
    await materialField(page).fill("");
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(id));
    expect(await rowOf(id)).toMatchObject({
      join_type: "first_come",
      approval_criteria: null,
      min_age: null,
      max_age: null,
      material_url: null,
      fee_note: FEE_NOTE,
    });
  });

  test("P08-12 U3 잠금: 참여 확정자가 있으면 쓴 참가비 설명도 잠기고, 비어 있던 설명은 채워야 저장된다", async ({ page }) => {
    const [written, empty] = await Promise.all([
      fixture({ fee: 15000, feeNote: FEE_NOTE, accepted: ["A"] }),
      fixture({ fee: 15000, accepted: ["A"] }),
    ]);
    await loginAs(page, editPath(written));

    // 장소 · 일시 · 참가비 · 참가비 설명 네 곳
    await expect(lockReason(page)).toHaveCount(4);
    await expect(feeNoteField(page)).toBeDisabled();
    await expect(feeNoteField(page)).toHaveValue(FEE_NOTE);
    await expect(feeNoteField(page)).toHaveAccessibleDescription(new RegExp(ACCEPTED_LOCK));
    const title = `[E2E] 설명 잠금 ${tag()}`;
    await titleField(page).fill(title);
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(written));
    expect(await rowOf(written)).toMatchObject({ title, fee: 15000, fee_note: FEE_NOTE });

    // MS14 전에 연 유료 소셜링(설명 없음): 참여 확정자가 있어도 설명은 열려 있고, 채워야 저장된다
    await page.goto(editPath(empty));
    await expect(lockReason(page)).toHaveCount(3);
    await expect(feeField(page)).toBeDisabled();
    await expect(feeNoteField(page)).toBeEnabled();
    await saveButton(page).click();
    await expect(errorOf(page, "feeNote")).toHaveText("참가비 설명을 입력해 주세요");
    await feeNoteField(page).fill("교재 복사비예요");
    await saveButton(page).click();
    await expect(page).toHaveURL(managePath(empty));
    expect((await rowOf(empty)).fee_note).toBe("교재 복사비예요");
  });

  test("새 칸과 오류가 모두 보여도 390px·320px 가로 스크롤 없음", async ({ page }) => {
    const id = await fixture({ joinType: "approval", fee: 15000, feeNote: FEE_NOTE, accepted: ["A"] });
    await loginAs(page, editPath(id));
    await pick(page, "연령 조건 (선택)", "나이 정하기");
    await materialField(page).fill("ko.wikipedia.org");
    await saveButton(page).click();
    await expect(errorOf(page, "materialUrl")).toBeVisible();
    await expect(errorOf(page, "minAge")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});
