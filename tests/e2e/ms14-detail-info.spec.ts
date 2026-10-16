import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS14 상세 정보 카드와 신청 확인의 새 줄 (03 3.3·6.3·8.2·8.3, spec M4·M7 · screen-cases P03-13~17, O02)
// 총 참가비 아래 참가비 설명(U3), 모집 방식 다음 연령 조건(SH1b, 호스트 승인만), 맨 아래 자료(SH3, 새 창).
// 시드 "필름 카메라로 골목 산책"은 그대로 읽기만 하고, 나머지는 테스트 전용 [E2E] 소셜링을 만들고 끝에 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Partial<FixtureOptions>) {
  const id = await createFixtureSocialing({ host: "B", capacity: 4, ...options });
  created.push(id);
  return id;
}

const MATERIAL_URL = "https://ko.wikipedia.org/wiki/%EC%88%98%ED%95%84";
const infoList = (page: Page) => page.getByRole("main").locator("dl").first();
const infoRow = (page: Page, label: string) =>
  infoList(page).locator(":scope > div").filter({ has: page.locator("dt", { hasText: label }) });
const rowLabels = (page: Page) => infoList(page).locator("dt");
const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const applySheet = (page: Page) => page.getByRole("dialog", { name: "신청할까요?" });

async function loginAs(page: Page, user: "A") {
  await page.goto("/login");
  await submitLogin(page, user);
  await expect(page).toHaveURL("/");
}

test.describe("MS14 상세 정보 카드 P03", () => {
  test("P03-13·15: 시드 '필름 카메라로 골목 산책' — 총 참가비 아래 참가비 설명, 모집 방식 다음 '연령 조건 20~39세', 자료 줄 없음", async ({
    page,
    request,
  }) => {
    const response = await request.get(
      `${supabaseUrl}/rest/v1/socialings?select=id&title=eq.${encodeURIComponent("필름 카메라로 골목 산책")}`,
      { headers: apiHeaders() },
    );
    const rows = (await response.json()) as { id: number }[];
    expect(rows, "시드 소셜링 (npm run seed)").toHaveLength(1);
    await page.goto(`/socialings/${rows[0].id}`);

    await expect(rowLabels(page)).toHaveText(["소셜링 일시", "신청 마감", "장소", "총 참가비", "모집 방식", "연령 조건", "인원"]);
    await expect(infoRow(page, "총 참가비")).toContainText(
      "출발 장소 카페 음료 5,000원. 필름은 각자 준비하고, 현장에서 따로 내는 돈은 없어요",
    );
    await expect(infoRow(page, "연령 조건").locator("dd")).toHaveText("20~39세");
    await expect(page.getByRole("link", { name: /자료 보기/ })).toHaveCount(0);
  });

  test("P03-13·15·16: 줄바꿈 있는 설명, 최소 나이만 '30세 이상', 자료 줄은 새 창 + 사이트 이름, 390px·320px 가로 스크롤 없음", async ({
    page,
  }) => {
    const id = await fixture({
      joinType: "approval",
      approvalCriteria: "에세이 한 편을 미리 읽어 올 수 있는 분",
      fee: 15000,
      feeNote: "장소 대여 10,000원 + 음료 5,000원\n현장에서 따로 내는 돈은 없어요",
      minAge: 30,
      materialUrl: MATERIAL_URL,
    });
    await page.goto(`/socialings/${id}`);

    await expect(rowLabels(page)).toHaveText(["소셜링 일시", "신청 마감", "장소", "총 참가비", "모집 방식", "연령 조건", "인원", "자료"]);
    const fee = infoRow(page, "총 참가비");
    await expect(fee.locator("dd").first()).toHaveText("15,000원");
    // 설명은 값 아래 줄 전체에 줄바꿈 그대로
    const note = fee.locator("dd").nth(1);
    await expect(note).toHaveText("장소 대여 10,000원 + 음료 5,000원\n현장에서 따로 내는 돈은 없어요");
    await expect(note).toHaveCSS("white-space", "pre-line");
    await expect(infoRow(page, "연령 조건").locator("dd")).toHaveText("30세 이상");

    const material = infoRow(page, "자료");
    const link = material.getByRole("link", { name: "자료 보기 (새 창에서 열려요)" });
    await expect(link).toHaveAttribute("href", MATERIAL_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(material).toContainText("ko.wikipedia.org");
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });

  test("P03-14·17: 무료여도 설명이 있으면 '무료' 아래 설명. 선착순이면 연령 조건이 저장돼 있어도 줄이 없고, 설명·자료가 없으면 줄도 없다", async ({
    page,
  }) => {
    const [freeWithNote, plain] = await Promise.all([
      fixture({ fee: 0, feeNote: "현장에서 각자 음료를 주문해요", maxAge: 39 }),
      fixture({ joinType: "approval", fee: 15000, maxAge: 39 }),
    ]);

    await page.goto(`/socialings/${freeWithNote}`);
    await expect(rowLabels(page)).toHaveText(["소셜링 일시", "신청 마감", "장소", "총 참가비", "모집 방식", "인원"]);
    await expect(infoRow(page, "총 참가비").locator("dd")).toHaveText(["무료", "현장에서 각자 음료를 주문해요"]);

    // MS14 전에 설명 없이 연 유료 소셜링: 보조 글 없이 보인다. 최대 나이만 '39세 이하'
    await page.goto(`/socialings/${plain}`);
    await expect(infoRow(page, "총 참가비").locator("dd")).toHaveText(["15,000원"]);
    await expect(infoRow(page, "연령 조건").locator("dd")).toHaveText("39세 이하");
    await expect(page.getByRole("link", { name: /자료 보기/ })).toHaveCount(0);
  });
});

test.describe("MS14 신청 확인 O02", () => {
  test("O02 참가비 설명·연령 조건: 요약의 총 참가비 아래 '참가비 설명: …', 승인 기준 상자 위 '연령 조건 20~39세'. 320px에서도 버튼이 보인다", async ({
    page,
  }) => {
    const id = await fixture({
      joinType: "approval",
      approvalCriteria: "필름 카메라나 휴대폰 카메라로 30장 이상 찍어 볼 분이면 좋아요. 사진 경험은 묻지 않아요.",
      fee: 15000,
      feeNote: "장소 대여 10,000원 + 음료 5,000원. 현장에서 따로 내는 돈은 없어요",
      minAge: 20,
      maxAge: 39,
      deadlineInHours: 24 * 5,
    });
    await loginAs(page, "A");
    await page.goto(`/socialings/${id}`);
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    const sheet = applySheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("스터디지점 강남점 · 15,000원");
    await expect(sheet).toContainText("참가비 설명: 장소 대여 10,000원 + 음료 5,000원. 현장에서 따로 내는 돈은 없어요");
    // 앞의 "•"는 읽지 않는 글자라 줄(p) 단위로 찾는다
    const age = sheet.locator("p").filter({ hasText: /^•?\s*연령 조건 20~39세$/ });
    await expect(age).toBeVisible();
    // 승인 기준 상자 위
    const criteria = sheet.getByText("호스트 승인 기준", { exact: true });
    const [ageBox, criteriaBox] = await Promise.all([age.boundingBox(), criteria.boundingBox()]);
    expect(ageBox!.y).toBeLessThan(criteriaBox!.y);

    const submit = sheet.getByRole("button", { name: "신청하기" });
    await expect(submit).toBeInViewport();
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
    await expect(submit).toBeInViewport();
    await expect(sheet.getByRole("button", { name: "돌아가기" })).toBeInViewport();

    await sheet.getByRole("button", { name: "돌아가기" }).click();
    await expect(sheet).toHaveCount(0);
  });

  test("O02: 설명·연령 조건이 없으면 두 줄 모두 없다 (선착순 무료)", async ({ page }) => {
    const id = await fixture({ fee: 0, maxAge: 39 });
    await loginAs(page, "A");
    await page.goto(`/socialings/${id}`);
    await bar(page).getByRole("button", { name: "신청하기" }).click();
    const sheet = applySheet(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("스터디지점 강남점 · 무료");
    await expect(sheet).not.toContainText("참가비 설명");
    await expect(sheet).not.toContainText("연령 조건");
    await sheet.getByRole("button", { name: "돌아가기" }).click();
  });
});
