import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { DEMO_USERS, seedSocialings } from "../../scripts/seed-data.mts";
import { expectNoHorizontalScroll } from "./helpers/auth";
import { apiHeaders, supabaseUrl } from "./helpers/supabase";

// MS13 시드 사진 (spec 7장 시드 조건, architecture 7장 시드, scripts/seed-assets/SOURCES.md).
// 시드가 대표 사진 10장·후기 사진 5장을 받은 그대로 올려 연결하고, 화면이 그 사진을 그리는지 본다. `npm run seed` 뒤에 돌린다.
// 다른 테스트가 [E2E] 소셜링을 동시에 만들고 지우므로, 시드 제목으로만 찾고 히어로는 DB와 맞을 때까지 다시 읽는다.

const ASSETS = resolve("scripts/seed-assets");
const definitions = seedSocialings();
const covers = definitions.filter((s) => s.cover_photo);
const reviewPhotos = definitions.flatMap((s) =>
  (s.reviews ?? []).filter((r) => r.photo).map((review) => ({ title: s.title, review })),
);

const socialingPhoto = (path: string) => `${supabaseUrl}/storage/v1/object/public/socialing-photos/${path}`;
const reviewPhoto = (path: string) => `${supabaseUrl}/storage/v1/object/public/review-photos/${path}`;

async function rest<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${supabaseUrl}/rest/v1/${path}`, { headers: apiHeaders() });
  expect(response.ok()).toBe(true);
  return response.json();
}

/** JPEG 머리(SOF)에서 가로·세로를 읽는다 */
function jpegSize(data: Buffer): { width: number; height: number } {
  expect(data.readUInt16BE(0), "JPEG 시작 표시").toBe(0xffd8);
  let offset = 2;
  while (offset + 9 < data.length) {
    const marker = data.readUInt16BE(offset);
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error("JPEG 크기를 찾지 못했습니다.");
}

async function socialingRows(request: APIRequestContext) {
  return rest<{ id: number; title: string; host_id: string; cover_photo_path: string | null }[]>(
    request,
    "socialings?select=id,title,host_id,cover_photo_path",
  );
}

const cardOf = (page: Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

test.describe("MS13 시드 사진", () => {
  test("사진 15장: 시드 정의와 폴더의 파일이 같고, 모두 1MB 이하 JPEG 1024×765 그대로", () => {
    const used = [...covers.map((s) => s.cover_photo!), ...reviewPhotos.map(({ review }) => review.photo!)];
    expect(used).toHaveLength(15);
    expect(new Set(used).size, "한 파일을 두 곳에 쓰지 않는다").toBe(15);
    const files = readdirSync(ASSETS).filter((name) => name.endsWith(".jpg"));
    expect(files.sort()).toEqual([...used].sort());

    for (const file of files) {
      const data = readFileSync(resolve(ASSETS, file));
      expect(data.length, `${file}: 버킷 한도 1MB 이하`).toBeLessThanOrEqual(1024 * 1024);
      expect(jpegSize(data), file).toEqual({ width: 1024, height: 765 });
    }

    // 사진 없이 카테고리 그림으로 두는 소셜링 4개 (PM 결정 2026-10-16)
    for (const title of [
      "영어 뉴스 한 편 같이 읽기",
      "수제 맥주 펍 투어",
      "직장인 영어 프레젠테이션 연습",
      "퇴근 후 영어 스몰토크: 맥주 한 잔과 함께",
    ]) {
      expect(definitions.find((s) => s.title === title)?.cover_photo, title).toBeUndefined();
    }
  });

  test("DB: 대표 사진 10개·후기 사진 5개가 그 사람 폴더 경로로 연결되고, 공개 주소가 저장소 파일 그대로 열린다", async ({
    request,
  }) => {
    const rows = await socialingRows(request);
    for (const s of definitions) {
      const row = rows.find((r) => r.title === s.title);
      expect(row, `${s.title}: 시드에 있어야 합니다`).toBeTruthy();
      expect(row!.cover_photo_path, s.title).toBe(s.cover_photo ? `${row!.host_id}/${s.cover_photo}` : null);
    }

    const reviews = await rest<{ user_id: string; body: string; photo_path: string | null; socialing: { title: string } }[]>(
      request,
      "reviews?select=user_id,body,photo_path,socialing:socialings(title)",
    );
    for (const s of definitions) {
      for (const review of s.reviews ?? []) {
        const row = reviews.find((r) => r.socialing.title === s.title && r.body === review.body);
        expect(row, `${s.title} 후기`).toBeTruthy();
        expect(row!.photo_path, `${s.title} 후기`).toBe(review.photo ? `${row!.user_id}/${review.photo}` : null);
      }
    }

    // 공개 주소가 열리고, 줄이거나 다시 저장하지 않은 같은 파일이다
    const urls = [
      ...covers.map((s) => {
        const row = rows.find((r) => r.title === s.title)!;
        return { url: socialingPhoto(row.cover_photo_path!), file: s.cover_photo! };
      }),
      ...reviewPhotos.map(({ title, review }) => {
        const row = reviews.find((r) => r.socialing.title === title && r.body === review.body)!;
        return { url: reviewPhoto(row.photo_path!), file: review.photo! };
      }),
    ];
    await Promise.all(
      urls.map(async ({ url, file }) => {
        const response = await request.get(url);
        expect(response.status(), file).toBe(200);
        expect(response.headers()["content-type"], file).toBe("image/jpeg");
        expect(Buffer.compare(await response.body(), readFileSync(resolve(ASSETS, file))), file).toBe(0);
      }),
    );
  });

  test("화면: 히어로·카드·상세·인증 후기가 시드 사진을 그리고, 사진 없는 소셜링은 카테고리 그림", async ({ page, request }) => {
    const rows = await socialingRows(request);
    const pathOf = (title: string) => rows.find((r) => r.title === title)!.cover_photo_path!;
    const speech = "영어로 내 일 소개하기: 3분 스피치";

    // 홈 히어로: 사진이 있으면 사진 전체 + 흰 글자, 없으면 카테고리 그림 (DESIGN.md hero-card)
    await page.goto("/");
    const hero = page.getByRole("region", { name: "지금 신청할 수 있는 가장 가까운 소셜링" });
    await expect(async () => {
      await page.reload();
      const [expected] = await rest<{ title: string; cover_photo_path: string | null }[]>(
        request,
        "socialing_summaries?select=title,cover_photo_path&can_apply=eq.true&order=starts_at.asc,id.asc&limit=1",
      );
      await expect(hero.getByRole("heading")).toHaveText(expected.title, { timeout: 2000 });
      if (expected.cover_photo_path) {
        await expect(hero.locator("img")).toHaveAttribute("src", socialingPhoto(expected.cover_photo_path), { timeout: 2000 });
      } else {
        await expect(hero.locator("img")).toHaveCount(0, { timeout: 2000 });
      }
    }).toPass({ timeout: 30_000 });

    // 탐색 카드: 96px 정사각 사진 / 사진 없는 카드는 카테고리 그림(사진 태그 없음)
    await page.goto("/explore");
    const photoCard = cardOf(page, speech).locator("img");
    await expect(photoCard).toHaveAttribute("src", socialingPhoto(pathOf(speech)));
    await photoCard.scrollIntoViewIfNeeded();
    const thumb = await photoCard.boundingBox();
    expect(Math.round(thumb!.width)).toBe(96);
    expect(Math.round(thumb!.height)).toBe(96);
    await expect(cardOf(page, "직장인 영어 프레젠테이션 연습").locator("img")).toHaveCount(0);
    await expect(cardOf(page, "퇴근 후 영어 스몰토크: 맥주 한 잔과 함께").locator("img")).toHaveCount(0);
    await expectNoHorizontalScroll(page);

    // 상세(시연 3단계): 맨 위 4:3 사진
    await page.goto(`/socialings/${rows.find((r) => r.title === speech)!.id}`);
    const cover = page.getByRole("main").locator("img").first();
    await expect(cover).toHaveAttribute("src", socialingPhoto(pathOf(speech)));
    const box = await cover.boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(4 / 3, 1);
    await expectNoHorizontalScroll(page);

    // 인증 후기(P10): 사진 있는 시드 후기 5개가 4:3 사진과 함께
    await page.goto("/reviews");
    for (const { title, review } of reviewPhotos) {
      const article = page
        .getByRole("article", { name: `${DEMO_USERS[review.user].nickname}님의 후기` })
        .filter({ hasText: review.body });
      await expect(article.getByRole("link", { name: title })).toBeVisible();
      await expect(article.getByRole("img", { name: "후기 사진" })).toHaveAttribute(
        "src",
        new RegExp(`/storage/v1/object/public/review-photos/[0-9a-f-]{36}/${review.photo!.replace(".", "\\.")}$`),
      );
    }
    await expectNoHorizontalScroll(page);
  });
});
