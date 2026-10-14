import { expect, test, type Page } from "@playwright/test";
import { submitLogin } from "./helpers/auth";
import { makeJpeg } from "./helpers/photos";
import { createFixtureSocialing, deleteFixtureSocialings, reviewsOf, supabaseUrl } from "./helpers/supabase";

// SP3 사진 업로드: 브라우저에서 1MB 이하로 줄여 Storage에 올리고, 실패해도 글은 남는다 (spec Q4, 6장, architecture 2장)
// MS5부터 후기 쓰기(P09)에서 확인한다(SP3 확인 화면 /dev/photo-upload는 지움). 호스트 C의 종료된 테스트 소셜링에
// A가 참여 확정된 상태로 쓴다. 올린 사진은 데모 계정 폴더에 남고 다음 `npm run seed`가 버킷을 비운다.

const ONE_MB = 1024 * 1024;

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

/** 종료된 테스트 소셜링(A 참여 확정)의 후기 쓰기를 비로그인으로 열고 A로 로그인해 돌아온다 */
async function openReviewWrite(page: Page) {
  const id = await createFixtureSocialing({
    host: "C",
    status: "completed",
    deadlineInHours: -26,
    startsInHours: -25,
    accepted: ["A"],
  });
  created.push(id);
  const path = `/socialings/${id}/review`;
  await page.goto(path);
  await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
  await submitLogin(page, "A");
  await expect(page).toHaveURL(path);
  return id;
}

const photoInput = (page: Page) => page.getByLabel("사진 선택", { exact: true });
const body = (page: Page) => page.getByRole("textbox", { name: "후기" });

test.describe("SP3 사진 업로드 (후기 쓰기)", () => {
  test("SP3·E02: 비로그인으로 후기 쓰기 주소 → 로그인 → 후기 쓰기로 돌아온다", async ({ page }) => {
    await openReviewWrite(page);
    await expect(page.getByRole("heading", { level: 1, name: "후기 쓰기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "사진 선택 · 1장" })).toBeVisible();
  });

  test("SP3: 1MB가 넘는 사진을 1MB 이하 JPEG로 줄여 내 폴더에 올린다", async ({ page, request }) => {
    test.setTimeout(90_000);
    await openReviewWrite(page);
    const big = await makeJpeg(page, 4000, 3000);
    expect(big.length).toBeGreaterThan(ONE_MB);

    const upload = page.waitForRequest(
      (req) => req.method() === "POST" && req.url().includes("/storage/v1/object/review-photos/"),
      { timeout: 60_000 },
    );
    await photoInput(page).setInputFiles({ name: "big-photo.jpg", mimeType: "image/jpeg", buffer: big });
    const path = decodeURIComponent(new URL((await upload).url()).pathname.split("/review-photos/")[1]);
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 60_000 });

    // 경로가 `<사용자 id>/…jpg`이고, 공개 주소로 받으면 1MB 이하 JPEG다
    expect(path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    const response = await request.get(`${supabaseUrl}/storage/v1/object/public/review-photos/${path}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
    expect((await response.body()).length).toBeLessThanOrEqual(ONE_MB);
  });

  test("SP3 Q4·P09-07: 업로드가 실패해도 글이 남고, 사진 없이 후기를 올릴 수 있다", async ({ page }) => {
    const id = await openReviewWrite(page);
    await page.route("**/storage/v1/object/review-photos/**", (route) => route.abort("failed"));

    const text = "사진이 안 올라가도 이 글은 남아야 해요";
    await body(page).fill(text);
    const small = await makeJpeg(page, 400, 300);
    await photoInput(page).setInputFiles({ name: "small.jpg", mimeType: "image/jpeg", buffer: small });

    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "다시 고르기" })).toBeVisible();
    await expect(body(page)).toHaveValue(text);

    await page.getByRole("button", { name: "사진 없이 올리기" }).click();
    await expect(page.getByRole("button", { name: "사진 선택 · 1장" })).toBeVisible();
    for (const question of ["참가자 구성", "금액 외에 돈", "진행 내용"]) {
      await page.getByRole("group", { name: new RegExp(question) }).getByText("예", { exact: true }).click();
    }
    await page.getByRole("button", { name: "후기 올리기" }).click();
    await expect(page).toHaveURL("/reviews");
    expect(await reviewsOf(id)).toEqual([
      { body: text, photo_path: null, members_match: true, extra_money: true, content_match: true },
    ]);
  });

  test("SP3: 브라우저가 열 수 없는 형식(HEIC 등)은 JPEG로 골라 달라고 안내한다", async ({ page }) => {
    await openReviewWrite(page);
    await photoInput(page).setInputFiles({
      name: "IMG_0001.HEIC",
      mimeType: "image/heic",
      buffer: Buffer.from("not-a-real-heic-file-for-test"),
    });
    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("JPEG로 골라 주세요")).toBeVisible();
  });
});
