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

// MS3 신청: 12줄 → 신청 확인 O02 → 7줄 (spec M7, 8.4, 8.6 · DESIGN.md bottom-sheet/confirm-apply, dialog/result, toast
// · 시나리오 4단계 · screen-cases P03-B16, O02 9가지, C12, C13, E13). 테스트 전용 [E2E] 소셜링만 만들고 끝에 지운다.

const bar = (page: Page) => page.getByRole("region", { name: "신청" });
const sheet = (page: Page) => page.getByRole("dialog", { name: "신청할까요?" });
const people = (page: Page) => page.locator("dl > div").filter({ hasText: "인원" });
const PAYMENT_NOTICE = "결제 기능이 없는 데모입니다. 실제 서비스에서는 플랫폼 공통 환불 규칙을 따릅니다.";

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: FixtureOptions) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

async function loginAs(page: Page, user: "A" | "P1") {
  await page.goto("/login");
  await submitLogin(page, user);
  await expect(page).toHaveURL("/");
}

async function openSheet(page: Page) {
  await bar(page).getByRole("button", { name: "신청하기" }).click();
  await expect(sheet(page)).toBeVisible();
}

test.describe("MS3 신청 O02", () => {
  test("시나리오 4단계·P03-B16: 비로그인 신청하기 → 로그인 → 상세 → O02(승인 기준·결과 안내·결제 안내) → 승인 대기", async ({
    page,
  }) => {
    const id = await fixture({
      host: "B",
      joinType: "approval",
      capacity: 4,
      approvalCriteria: "영어로 1분 자기소개를 준비해 주세요.",
    });

    await page.goto(`/socialings/${id}`);
    await bar(page).getByRole("link", { name: "신청하기" }).click();
    await submitLogin(page, "A");
    await expect(page).toHaveURL(`/socialings/${id}`);

    // O02 내용
    await openSheet(page);
    await expect(sheet(page)).toContainText(/\[E2E\] 테스트 소셜링 .+ · \d+\/\d+\(.\) (오전|오후) \d+:\d{2}/);
    await expect(sheet(page)).toContainText("스터디지점 강남점 · 무료");
    await expect(sheet(page)).toContainText("호스트 승인 기준");
    await expect(sheet(page)).toContainText("영어로 1분 자기소개를 준비해 주세요.");
    await expect(sheet(page)).toContainText("호스트가 승인하면 참여가 확정돼요");
    await expect(sheet(page)).toContainText(PAYMENT_NOTICE);
    await expectNoHorizontalScroll(page);

    // 돌아가기 → 창만 닫힘
    await sheet(page).getByRole("button", { name: "돌아가기" }).click();
    await expect(sheet(page)).toHaveCount(0);
    expect(await applicationsOf(id)).toEqual([]);

    // 신청 → 창이 닫히고 7줄 + 짧은 안내
    await openSheet(page);
    await sheet(page).getByRole("button", { name: "신청하기" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText("호스트가 승인하면 참여 확정돼요");
    await expect(bar(page).getByRole("button", { name: "신청하기" })).toHaveCount(0);

    const toast = page.getByTestId("toast");
    await expect(toast).toContainText("신청했어요");
    await expect(toast.getByRole("link", { name: "내 소셜링에서 보기" })).toHaveAttribute("href", "/me");
    // C12: 아래 영역 바로 위에 뜬다
    const barBox = await bar(page).boundingBox();
    const toastBox = await toast.boundingBox();
    expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(barBox!.y);

    // 승인 대기는 인원에 세지 않는다
    await expect(people(page)).toContainText("참가자 0/4명");
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);
  });

  test("O02 선착순: 결과 안내 '신청하면 바로 참여가 확정돼요' → 참여 확정 + 만나는 일시, 인원 +1", async ({ page }) => {
    const id = await fixture({ host: "C", capacity: 3, accepted: ["P2"] });
    await loginAs(page, "P1");
    await page.goto(`/socialings/${id}`);
    await expect(people(page)).toContainText("참가자 1/3명");

    await openSheet(page);
    await expect(sheet(page)).toContainText("신청하면 바로 참여가 확정돼요");
    await expect(sheet(page)).not.toContainText("호스트 승인 기준");
    await sheet(page).getByRole("button", { name: "신청하기" }).click();

    await expect(bar(page).getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(bar(page)).toContainText(/\d+\/\d+\(.\) (오전|오후) \d+:\d{2}에 만나요/);
    await expect(people(page)).toContainText("참가자 2/3명");
  });

  test("O02 호스트 승인, 승인 기준 없음: 기준 상자 없이 결과 안내만", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await loginAs(page, "P1");
    await page.goto(`/socialings/${id}`);
    await openSheet(page);
    await expect(sheet(page)).toContainText("호스트가 승인하면 참여가 확정돼요");
    await expect(sheet(page)).not.toContainText("호스트 승인 기준");
  });

  // 창을 연 사이 신청할 수 없게 된 경우 4가지 (spec 8.4 "O02 실패")
  const failures: {
    name: string;
    options: FixtureOptions;
    meanwhile: (id: number) => Promise<unknown>;
    reason: string;
    after: (page: Page) => Promise<void>;
  }[] = [
    {
      name: "정원 마감",
      options: { host: "C", capacity: 2, accepted: ["P2"] },
      meanwhile: (id) => addApplication(id, "P3", "accepted"),
      reason: "방금 정원이 찼어요",
      after: async (page) => {
        await expect(bar(page).getByRole("button", { name: "정원 마감" })).toBeDisabled();
      },
    },
    {
      name: "신청 마감",
      options: { host: "C" },
      meanwhile: (id) => updateFixtureSocialing(id, { deadlineInHours: -1 }),
      reason: "신청 마감 일시가 지났어요",
      after: async (page) => {
        await expect(bar(page).getByRole("button", { name: "신청 마감" })).toBeDisabled();
      },
    },
    {
      name: "호스트 취소",
      options: { host: "C" },
      meanwhile: (id) => updateFixtureSocialing(id, { status: "canceled" }),
      reason: "호스트가 취소한 소셜링이에요",
      after: async (page) => {
        await expect(bar(page).getByRole("button", { name: "호스트 취소" })).toBeDisabled();
      },
    },
    {
      name: "이미 신청",
      options: { host: "C", joinType: "approval" },
      meanwhile: (id) => addApplication(id, "P1", "pending"),
      reason: "이미 신청한 소셜링이에요",
      after: async (page) => {
        await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
      },
    },
  ];

  for (const { name, options, meanwhile, reason, after } of failures) {
    test(`O02 실패 ${name}: 결과 창 '신청하지 못했어요' + 이유 → 확인 → 상세를 새로 고침`, async ({ page }) => {
      const id = await fixture(options);
      await loginAs(page, "P1");
      await page.goto(`/socialings/${id}`);
      await openSheet(page);
      await meanwhile(id);

      await sheet(page).getByRole("button", { name: "신청하기" }).click();
      const result = page.getByRole("alertdialog", { name: "신청하지 못했어요" });
      await expect(result).toContainText(reason);
      await expect(sheet(page)).toHaveCount(0);
      await expect(page.getByTestId("toast")).toHaveCount(0);

      await result.getByRole("button", { name: "확인" }).click();
      await expect(result).toHaveCount(0);
      await after(page);
    });
  }

  test("O02 네트워크 오류: 창을 연 채 안내 + 다시 시도, 다시 누르면 신청된다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await loginAs(page, "P1");
    await page.goto(`/socialings/${id}`);
    await openSheet(page);

    // 서버 액션 요청만 끊는다
    await page.route(`**/socialings/${id}`, (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
    );
    await sheet(page).getByRole("button", { name: "신청하기" }).click();
    await expect(sheet(page).getByRole("alert")).toHaveText("신청하지 못했어요. 연결을 확인하고 다시 시도해 주세요");
    await expect(sheet(page).getByRole("button", { name: "다시 시도" })).toBeEnabled();
    expect(await applicationsOf(id)).toEqual([]);

    await page.unroute(`**/socialings/${id}`);
    await sheet(page).getByRole("button", { name: "다시 시도" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(bar(page).getByText("승인 대기", { exact: true })).toBeVisible();
  });

  test("C13: 처리 중에는 버튼이 '처리 중…'으로 잠기고 창이 닫히지 않는다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await loginAs(page, "P1");
    await page.goto(`/socialings/${id}`);
    await openSheet(page);

    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(`**/socialings/${id}`, async (route) => {
      if (route.request().method() === "POST" && route.request().headers()["next-action"]) await held;
      await route.continue();
    });
    await sheet(page).getByRole("button", { name: "신청하기" }).click();

    await expect(sheet(page).getByRole("button", { name: "처리 중…" })).toBeDisabled();
    await expect(sheet(page).getByRole("button", { name: "돌아가기" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeVisible();

    release();
    await expect(sheet(page)).toHaveCount(0);
    expect((await applicationsOf(id)).map((a) => a.status)).toEqual(["pending"]);
  });

  test("E13: 누르는 순간 로그인이 끊겼으면 로그인 → 상세로 돌아와 한 번 더 누른다", async ({ page }) => {
    const id = await fixture({ host: "C", joinType: "approval" });
    await loginAs(page, "P1");
    await page.goto(`/socialings/${id}`);
    await openSheet(page);

    await page.context().clearCookies();
    await sheet(page).getByRole("button", { name: "신청하기" }).click();
    await expect(page).toHaveURL(`/login?next=%2Fsocialings%2F${id}`);
    expect(await applicationsOf(id)).toEqual([]);

    await submitLogin(page, "P1");
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(bar(page).getByRole("button", { name: "신청하기" })).toBeVisible();
  });
});
