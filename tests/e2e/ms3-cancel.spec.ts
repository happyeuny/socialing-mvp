import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import {
  addApplication,
  applicationsOf,
  createFixtureSocialing,
  deleteFixtureSocialings,
  updateFixtureSocialing,
  type FixtureOptions,
} from "./helpers/supabase";

// MS3 신청 취소: 7줄 → O05 → 9·10줄, 다시 신청 (spec M7, 8.4 · DESIGN.md bottom-sheet/confirm-cancel-application
// · screen-cases P03-B08·B09·B11~B14, O05 5가지). 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const cancelSheet = (page: Page) => page.getByRole("dialog", { name: "신청을 취소할까요?" });
const people = (page: Page) => page.locator("dl > div").filter({ hasText: "인원" });
const FIRST_COME_NOTICE = "취소하면 다른 사람이 자리를 채울 수 있어요.";

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

async function openDetailAs(page: Page, id: number) {
  await page.goto(`/login?next=/socialings/${id}`);
  await submitLogin(page, "P1");
  await expect(page).toHaveURL(`/socialings/${id}`);
}

async function openCancelSheet(page: Page) {
  await bar(page).getByRole("button", { name: "신청 취소" }).click();
  await expect(cancelSheet(page)).toBeVisible();
}

test.describe("MS3 신청 취소 O05", () => {
  test("신청 취소 E2E·P03-B08·B12: 승인 대기 → O05(선착순 문구 없음) → '신청을 취소했어요' → 다시 신청", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await openDetailAs(page, id);

    // 7줄: 승인 대기 + 신청 취소
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("호스트가 승인하면 참여 확정돼요");

    // O05 승인 대기 문구: 선착순 문장 없음. 돌아가기 → 창만 닫힘
    await openCancelSheet(page);
    await expect(cancelSheet(page)).not.toContainText(FIRST_COME_NOTICE);
    await expect(cancelSheet(page).getByRole("button", { name: "신청 취소" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await cancelSheet(page).getByRole("button", { name: "돌아가기" }).click();
    await expect(cancelSheet(page)).toHaveCount(0);
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);

    // 취소 → 9줄 + 짧은 안내
    await openCancelSheet(page);
    await cancelSheet(page).getByRole("button", { name: "신청 취소" }).click();
    await expect(cancelSheet(page)).toHaveCount(0);
    await expect(page.getByTestId("toast")).toHaveText("신청을 취소했어요");
    await expect(bar(page).getByText("신청 취소", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("자리가 남아 있어 다시 신청할 수 있어요");

    // 다시 신청 → O02 → 새 신청 행
    await bar(page).getByRole("button", { name: "다시 신청" }).click();
    const applySheet = page.getByRole("dialog", { name: "신청할까요?" });
    await applySheet.getByRole("button", { name: "신청하기" }).click();
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["canceled", "pending"]);
  });

  test("P03-B09·O05 선착순 문구: 참여 확정을 취소하면 자리가 다시 생긴다 (정원 마감 → 9줄)", async ({ page }) => {
    const id = await fixture({ host: "C", capacity: 2, accepted: ["P1", "P2"] });
    await openDetailAs(page, id);
    await expect(people(page)).toContainText("참가자 2/2명");
    await expect(bar(page).getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText(/에 만나요/);

    await openCancelSheet(page);
    await expect(cancelSheet(page)).toContainText(FIRST_COME_NOTICE);
    await cancelSheet(page).getByRole("button", { name: "신청 취소" }).click();

    await expect(people(page)).toContainText("참가자 1/2명");
    await expect(bar(page).getByText("신청 취소", { exact: true })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "다시 신청" })).toBeVisible();
  });

  test("P03-B11: 거절됐어도 자리가 남아 있으면 '거절' + 다시 신청", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "rejected");
    await openDetailAs(page, id);
    await expect(bar(page).getByText("거절", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("자리가 남아 있어 다시 신청할 수 있어요");
    await expect(bar(page).getByRole("button", { name: "다시 신청" })).toBeVisible();
  });

  const closedCases: { name: string; options: FixtureOptions; status: "rejected" | "canceled"; chip: string; reason: string }[] =
    [
      {
        name: "P03-B13 거절 · 신청 마감",
        options: { host: "C", joinType: "approval", deadlineInHours: -1 },
        status: "rejected",
        chip: "거절",
        reason: "신청 마감 일시가 지나 다시 신청할 수 없어요",
      },
      {
        name: "P03-B14 신청 취소 · 정원 마감",
        options: { host: "C", capacity: 2, accepted: ["P2", "P3"] },
        status: "canceled",
        chip: "신청 취소",
        reason: "정원이 차서 다시 신청할 수 없어요",
      },
      {
        name: "P03-B14 신청 취소 · 소셜링 일시 지남",
        options: { host: "C", deadlineInHours: -3, startsInHours: -2 },
        status: "canceled",
        chip: "신청 취소",
        reason: "소셜링 일시가 지나 다시 신청할 수 없어요",
      },
    ];

  for (const { name, options, status, chip, reason } of closedCases) {
    test(`10줄 ${name}: 칩 + 다시 신청할 수 없는 이유 + 다른 소셜링 보기`, async ({ page }) => {
      const id = await fixture(options);
      await addApplication(id, "P1", status);
      await openDetailAs(page, id);
      await expect(bar(page).getByText(chip, { exact: true })).toBeVisible();
      await expect(bar(page)).toContainText(reason);
      await expect(bar(page).getByRole("link", { name: "다른 소셜링 보기" })).toHaveAttribute("href", "/explore");
      await expect(bar(page).getByRole("button")).toHaveCount(0);
    });
  }

  test("O05 실패 일시 지남: 창을 연 사이 소셜링 일시가 지나면 '소셜링 일시가 지나 취소할 수 없어요' → 확인 → 새로 고침", async ({
    page,
  }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await openDetailAs(page, id);
    await openCancelSheet(page);
    await updateFixtureSocialing(id, { startsInHours: -1 });

    await cancelSheet(page).getByRole("button", { name: "신청 취소" }).click();
    const result = page.getByRole("alertdialog", { name: "신청을 취소하지 못했어요" });
    await expect(result).toContainText("소셜링 일시가 지나 취소할 수 없어요");
    await result.getByRole("button", { name: "확인" }).click();

    // 8줄: 승인 대기인 채로 일시 지남
    await expect(bar(page)).toContainText("호스트가 응답하지 않았어요");
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);
  });

  test("O05 네트워크 오류: 창을 연 채 안내 + 다시 시도", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await addApplication(id, "P1", "pending");
    await openDetailAs(page, id);
    await openCancelSheet(page);

    await page.route(`**/socialings/${id}`, (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
    );
    await cancelSheet(page).getByRole("button", { name: "신청 취소" }).click();
    await expect(cancelSheet(page).getByRole("alert")).toHaveText(
      "신청을 취소하지 못했어요. 연결을 확인하고 다시 시도해 주세요",
    );
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);

    await page.unroute(`**/socialings/${id}`);
    await cancelSheet(page).getByRole("button", { name: "다시 시도" }).click();
    await expect(cancelSheet(page)).toHaveCount(0);
    await expect(bar(page).getByRole("button", { name: "다시 신청" })).toBeVisible();
  });
});
