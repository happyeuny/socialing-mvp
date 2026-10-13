import { expect, test, type Page } from "@playwright/test";
import { submitLogin } from "./helpers/auth";
import { createFixtureSocialing, deleteFixtureSocialings, type FixtureOptions } from "./helpers/supabase";

// MS2 상세 아래 고정 영역의 비로그인·불가 줄 (spec 8.4 2·11·13줄, 8.9 · DESIGN.md C4 apply-bar
// · screen-cases P03-B03·B15·B17·B18·B19, E04 · 시나리오 4단계의 "신청 → 로그인 → 상세로 돌아옴")

const bar = (page: Page) => page.getByRole("region", { name: "신청" });

async function withFixture(options: FixtureOptions, run: (id: number) => Promise<void>) {
  const id = await createFixtureSocialing(options);
  try {
    await run(id);
  } finally {
    await deleteFixtureSocialings([id]);
  }
}

test.describe("MS2 상세 아래 고정 영역", () => {
  test("P03-B15·E04: 비로그인 '신청하기' → 로그인 → 상세로 돌아와 영역을 다시 정한다 (자동 신청 없음)", async ({
    page,
  }) => {
    await withFixture({ host: "B", joinType: "approval" }, async (id) => {
      await page.goto(`/socialings/${id}`);
      await expect(bar(page)).toHaveCount(1);
      await expect(bar(page)).toContainText("신청하면 호스트가 승인한 뒤 참여가 확정돼요");

      await bar(page).getByRole("link", { name: "신청하기" }).click();
      await expect(page).toHaveURL(`/login?next=%2Fsocialings%2F${id}`);
      await submitLogin(page, "A");

      await expect(page).toHaveURL(`/socialings/${id}`);
      await expect(bar(page).getByRole("link", { name: "신청하기" })).toBeVisible();
      // 로그인만으로 신청되지 않는다 (참가자 0명 그대로)
      await expect(page.locator("dl > div").filter({ hasText: "인원" })).toContainText("참가자 0/2명");
    });
  });

  test("11줄 선착순 안내", async ({ page }) => {
    await withFixture({ host: "B" }, async (id) => {
      await page.goto(`/socialings/${id}`);
      await expect(bar(page)).toContainText("신청하면 바로 참여가 확정돼요");
    });
  });

  const closedCases: { name: string; options: FixtureOptions; button: string; reason: string }[] = [
    {
      name: "P03-B17 신청 마감",
      options: { host: "B", deadlineInHours: -1 },
      button: "신청 마감",
      reason: "신청 마감 일시가 지났어요",
    },
    {
      name: "P03-B18 정원 마감",
      options: { host: "B", capacity: 2, accepted: ["A", "P1"] },
      button: "정원 마감",
      reason: "참여 확정 인원이 정원에 찼어요",
    },
    {
      name: "P03-B19 지난 소셜링 (확정 안 된 채 일시 지남)",
      options: { host: "B", deadlineInHours: -3, startsInHours: -2 },
      button: "지난 소셜링",
      reason: "소셜링 일시가 지났어요",
    },
    {
      name: "P03-B19 지난 소셜링 (종료)",
      options: { host: "B", status: "completed", deadlineInHours: -3, startsInHours: -2 },
      button: "지난 소셜링",
      reason: "소셜링 일시가 지났어요",
    },
  ];

  for (const { name, options, button, reason } of closedCases) {
    test(`13줄 ${name}: 비활성 버튼 + 이유 + 다른 소셜링 보기`, async ({ page }) => {
      await withFixture(options, async (id) => {
        await page.goto(`/socialings/${id}`);
        await expect(bar(page)).toHaveCount(1);
        await expect(bar(page).getByRole("button", { name: button })).toBeDisabled();
        await expect(bar(page)).toContainText(reason);
        await expect(bar(page).getByRole("link", { name: "신청하기" })).toHaveCount(0);
        await expect(bar(page).getByRole("link", { name: "다른 소셜링 보기" })).toHaveAttribute("href", "/explore");
      });
    });
  }

  test("2줄 P03-B03: 호스트 취소는 신청 마감보다 먼저", async ({ page }) => {
    await withFixture({ host: "B", status: "canceled", deadlineInHours: -1 }, async (id) => {
      await page.goto(`/socialings/${id}`);
      await expect(bar(page).getByRole("button", { name: "호스트 취소" })).toBeDisabled();
      await expect(bar(page)).toContainText("호스트가 취소한 소셜링이에요");
      await expect(bar(page)).not.toContainText("신청 마감");
      await bar(page).getByRole("link", { name: "다른 소셜링 보기" }).click();
      await expect(page).toHaveURL("/explore");
    });
  });

  test("영역은 화면 맨 아래에 붙어 있고 내용을 가리지 않는다", async ({ page }) => {
    await withFixture({ host: "B" }, async (id) => {
      await page.goto(`/socialings/${id}`);
      const box = await bar(page).boundingBox();
      const viewport = page.viewportSize()!;
      expect(Math.round(box!.y + box!.height)).toBe(viewport.height);

      // 맨 아래까지 내리면 호스트 묶음이 영역 위에 보인다
      await page.mouse.wheel(0, 5000);
      const host = page.getByRole("heading", { level: 3, name: "호스트" });
      await expect(host).toBeInViewport();
      const hostBox = await host.boundingBox();
      const barBox = await bar(page).boundingBox();
      expect(hostBox!.y + hostBox!.height).toBeLessThanOrEqual(barBox!.y);
    });
  });
});
