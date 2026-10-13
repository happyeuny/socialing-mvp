import { expect, test, type Page } from "@playwright/test";
import { submitLogin } from "./helpers/auth";
import { supabaseUrl } from "./helpers/supabase";

// SP3 사진 업로드: 브라우저에서 1MB 이하로 줄여 Storage에 올리고, 실패해도 글은 남는다 (spec Q4, 6장, architecture 2장)
// 올린 사진은 데모 계정 폴더에 남고 다음 `npm run seed`가 버킷을 비운다.

const ONE_MB = 1024 * 1024;

async function openCheckPage(page: Page) {
  await page.goto("/dev/photo-upload");
  await submitLogin(page, "A");
  await expect(page).toHaveURL("/dev/photo-upload");
}

/** 브라우저 canvas로 무늬가 거친 큰 JPEG를 만든다 (잘 줄어들지 않는 최악의 사진) */
async function makeJpeg(page: Page, width: number, height: number): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      const image = context.createImageData(width, height);
      for (let i = 0; i < image.data.length; i += 4) {
        image.data[i] = Math.random() * 255;
        image.data[i + 1] = Math.random() * 255;
        image.data[i + 2] = Math.random() * 255;
        image.data[i + 3] = 255;
      }
      context.putImageData(image, 0, 0);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    { width, height },
  );
  return Buffer.from(base64, "base64");
}

test.describe("SP3 사진 업로드", () => {
  test("SP3: 비로그인은 로그인 화면으로 갔다가 돌아온다", async ({ page }) => {
    await openCheckPage(page);
    await expect(page.getByRole("heading", { level: 1, name: "사진 올리기 확인" })).toBeVisible();
  });

  test("SP3: 1MB가 넘는 사진을 1MB 이하 JPEG로 줄여 내 폴더에 올린다", async ({ page, request }) => {
    test.setTimeout(90_000);
    await openCheckPage(page);
    const big = await makeJpeg(page, 4000, 3000);
    expect(big.length).toBeGreaterThan(ONE_MB);

    await page.getByLabel("사진 선택").setInputFiles({ name: "big-photo.jpg", mimeType: "image/jpeg", buffer: big });
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 60_000 });

    const uploadedBytes = Number(await page.getByTestId("uploaded-size").getAttribute("data-bytes"));
    expect(uploadedBytes).toBeLessThanOrEqual(ONE_MB);
    await expect(page.getByTestId("uploaded-size")).toContainText("image/jpeg");

    // 숨은 칸의 경로가 `<사용자 id>/…jpg`이고, 공개 주소로 받으면 1MB 이하 JPEG다
    const path = await page.locator('input[name="photo_path"]').inputValue();
    expect(path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    const response = await request.get(`${supabaseUrl}/storage/v1/object/public/review-photos/${path}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/jpeg");
    expect((await response.body()).length).toBeLessThanOrEqual(ONE_MB);
  });

  test("SP3 Q4: 업로드가 실패해도 글이 남고, 사진 없이 제출할 수 있다", async ({ page }) => {
    await openCheckPage(page);
    await page.route("**/storage/v1/object/review-photos/**", (route) => route.abort("failed"));

    const body = "사진이 안 올라가도 이 글은 남아야 해요";
    await page.getByLabel(/^글/).fill(body);
    const small = await makeJpeg(page, 400, 300);
    await page.getByLabel("사진 선택").setInputFiles({ name: "small.jpg", mimeType: "image/jpeg", buffer: small });

    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "다시 고르기" })).toBeVisible();
    await expect(page.getByLabel(/^글/)).toHaveValue(body);
    await expect(page.locator('input[name="photo_path"]')).toHaveValue("");

    await page.getByRole("button", { name: "사진 없이 올리기" }).click();
    await expect(page.getByRole("button", { name: "사진 선택 · 1장" })).toBeVisible();
    await page.getByRole("button", { name: "제출 확인" }).click();
    await expect(page.getByTestId("submitted")).toHaveText(`글 ${body.length}자 · 사진 없음`);
  });

  test("SP3: 브라우저가 열 수 없는 형식(HEIC 등)은 JPEG로 골라 달라고 안내한다", async ({ page }) => {
    await openCheckPage(page);
    await page.getByLabel("사진 선택").setInputFiles({
      name: "IMG_0001.HEIC",
      mimeType: "image/heic",
      buffer: Buffer.from("not-a-real-heic-file-for-test"),
    });
    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("JPEG로 골라 주세요")).toBeVisible();
  });
});
