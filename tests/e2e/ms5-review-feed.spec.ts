import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { formatMonthDay } from "../../lib/format";
import { expectNoHorizontalScroll } from "./helpers/auth";
import {
  addReview,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  signIn,
  supabaseUrl,
  titleOf,
} from "./helpers/supabase";

// MS5 인증 후기 P10 (spec M10, 8.2, 8.6 · screen-cases P10-01~05 · 시나리오 9단계 "P10 → 소셜링 제목 → P03")
// 로그인 없이 본다. 다른 테스트가 [E2E] 후기를 동시에 만들고 지우므로, DB와 비교하는 부분은 다시 읽어 맞을 때까지 기다린다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

const feed = (page: Page) => page.getByRole("main").getByRole("listitem");
const reviewOf = (page: Page, socialingTitle: string) =>
  page.getByRole("article").filter({ has: page.getByRole("link", { name: socialingTitle }) });

type FeedRow = { body: string; created_at: string; profiles: { nickname: string }; socialings: { title: string } };

async function latestReviews(request: APIRequestContext, limit: number): Promise<FeedRow[]> {
  const response = await request.get(
    `${supabaseUrl}/rest/v1/reviews?select=body,created_at,profiles(nickname),socialings(title)&order=created_at.desc,id.desc&limit=${limit}`,
    { headers: apiHeaders() },
  );
  expect(response.ok()).toBe(true);
  return response.json();
}

/** 종료된 테스트 소셜링에 P1의 후기를 넣는다. 사진을 주면 P1 폴더에 작은 파일을 올리고 그 경로를 붙인다 */
async function reviewedFixture(request: APIRequestContext, { body, withPhoto }: { body: string; withPhoto: boolean }) {
  const id = await createFixtureSocialing({
    host: "C",
    status: "completed",
    deadlineInHours: -26,
    startsInHours: -25,
    accepted: ["P1"],
  });
  created.push(id);
  let photoPath: string | undefined;
  if (withPhoto) {
    const token = await signIn(request, "P1");
    const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub;
    photoPath = `${userId}/${randomUUID()}.jpg`;
    const upload = await request.post(`${supabaseUrl}/storage/v1/object/review-photos/${photoPath}`, {
      headers: { ...apiHeaders(token), "Content-Type": "image/jpeg" },
      data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    expect(upload.status()).toBe(200);
  }
  await addReview(id, "P1", { body, photoPath });
  return { id, title: await titleOf(id), photoPath };
}

test.describe("MS5 인증 후기 P10", () => {
  test("P10-01: 아래 탭 '후기' → 제목·기준 문구, 후기 최신순(닉네임 · 작성일 · 참여 인증 · 소셜링 제목 · 글), 로그인 없이", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "아래 탭" });
    await tabs.getByRole("link", { name: "후기" }).click();
    await expect(page).toHaveURL("/reviews");
    await expect(page.getByRole("heading", { level: 1, name: "인증 후기" })).toBeVisible();
    await expect(page.getByText("참여를 마친 사람만 쓸 수 있어요 · 최신순")).toBeVisible();
    await expect(tabs.getByRole("link", { name: "후기" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();

    // 맨 위 5개가 DB의 최신순과 같다
    await expect(async () => {
      await page.reload();
      const expected = await latestReviews(request, 5);
      const items = feed(page);
      for (const [index, review] of expected.entries()) {
        const item = items.nth(index);
        await expect(item).toContainText(review.profiles.nickname, { timeout: 1000 });
        await expect(item).toContainText(formatMonthDay(review.created_at), { timeout: 1000 });
        await expect(item).toContainText("참여 인증", { timeout: 1000 });
        await expect(item.getByRole("link", { name: review.socialings.title }), review.socialings.title).toHaveAttribute(
          "href",
          /^\/socialings\/\d+$/,
          { timeout: 1000 },
        );
        await expect(item).toContainText(review.body, { timeout: 1000 });
      }
    }).toPass({ timeout: 20_000 });

    // 시드 후기 16개가 모두 보인다 (최대 50개)
    expect(await feed(page).count()).toBeGreaterThanOrEqual(16);
    expect(await feed(page).count()).toBeLessThanOrEqual(50);
    // 맞춤 정렬·좋아요·댓글 없음
    await expect(page.getByRole("button", { name: /좋아요|댓글/ })).toHaveCount(0);
  });

  test("P10-01·P10-02: 사진 있는 후기는 4:3 사진, 사진 없는 후기는 글만. 글의 줄바꿈은 그대로", async ({
    page,
    request,
  }) => {
    const withPhoto = await reviewedFixture(request, { body: "사진과 함께 쓴 후기예요.\n둘째 줄이에요.", withPhoto: true });
    const noPhoto = await reviewedFixture(request, { body: "사진 없이 글만 쓴 후기예요.", withPhoto: false });

    await page.goto("/reviews");
    const photoCard = reviewOf(page, withPhoto.title);
    await expect(photoCard).toContainText("민지");
    const photo = photoCard.getByRole("img", { name: "후기 사진" });
    await expect(photo).toHaveAttribute("src", `${supabaseUrl}/storage/v1/object/public/review-photos/${withPhoto.photoPath}`);
    const box = await photo.boundingBox();
    expect(Math.round((box!.width / box!.height) * 3)).toBe(4);
    expect((await request.get((await photo.getAttribute("src"))!)).status()).toBe(200);
    expect(await photoCard.locator("p").last().innerText()).toBe("사진과 함께 쓴 후기예요.\n둘째 줄이에요.");

    const textCard = reviewOf(page, noPhoto.title);
    await expect(textCard).toContainText("사진 없이 글만 쓴 후기예요.");
    await expect(textCard.getByRole("img")).toHaveCount(0);

    // 새로 쓴 후기일수록 위에 (사진 없는 후기를 나중에 넣음)
    const titles = await page.getByRole("main").getByRole("link").allTextContents();
    expect(titles.indexOf(noPhoto.title)).toBeLessThan(titles.indexOf(withPhoto.title));
  });

  test("9단계: 소셜링 제목을 누르면 그 소셜링 상세", async ({ page, request }) => {
    const { id, title } = await reviewedFixture(request, { body: "제목을 눌러 상세로 가 보는 후기예요.", withPhoto: false });

    await page.goto("/reviews");
    await reviewOf(page, title).getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });

  test("홈 '최근 인증 후기 전체 보기' → 인증 후기", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "최근 인증 후기 전체 보기" }).click();
    await expect(page).toHaveURL("/reviews");
    await expect(page.getByRole("heading", { level: 1, name: "인증 후기" })).toBeVisible();
  });

  test("P10-03: 빈 상태 → '아직 후기가 없어요' + 탐색하기", async ({ page }) => {
    await page.goto("/reviews?_state=empty");
    await expect(page.getByText("아직 후기가 없어요")).toBeVisible();
    await page.getByRole("link", { name: "탐색하기" }).click();
    await expect(page).toHaveURL("/explore");
  });

  test("P10-04·P10-05: 로딩 스켈레톤, 화면 오류(다시 시도 · 홈으로)", async ({ page }) => {
    await page.goto("/reviews?_state=loading");
    await expect(page.getByRole("status")).toContainText("불러오는 중");
    await expect(page.getByRole("heading", { level: 1, name: "인증 후기" })).toBeVisible();

    await page.goto("/reviews?_state=error");
    await expect(page.getByRole("alert").filter({ hasText: "불러오지 못했어요" })).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    await page.getByRole("link", { name: "홈으로" }).click();
    await expect(page).toHaveURL("/");
  });

  test("390px·320px에서 가로 스크롤이 없다 (긴 글·사진 후기 포함)", async ({ page, request }) => {
    await reviewedFixture(request, { body: "가".repeat(500), withPhoto: true });
    await page.goto("/reviews");
    await expect(feed(page).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});
