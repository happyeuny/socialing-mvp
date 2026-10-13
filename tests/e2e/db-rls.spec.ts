import { expect, test, type APIRequestContext } from "@playwright/test";

// MS1 스키마: 비로그인(publishable 키)으로 본 권한 (architecture 4장, tasks MS1 완료 기준)
// 브라우저 화면이 아니라 Supabase REST·Storage API를 직접 부른다.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function anonHeaders() {
  if (!supabaseUrl || !publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 필요합니다.");
  }
  return { apikey: publishableKey, "Content-Type": "application/json" };
}

async function anonSelect(request: APIRequestContext, table: string, select: string) {
  return request.get(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
    headers: anonHeaders(),
  });
}

test.describe("MS1 권한: 비로그인", () => {
  test("review_checks는 0행이거나 거부된다", async ({ request }) => {
    const response = await anonSelect(request, "review_checks", "*");
    if (response.ok()) {
      expect(await response.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });

  for (const table of ["socialings", "categories", "regions", "venues", "reviews"]) {
    test(`${table}는 읽을 수 있다`, async ({ request }) => {
      const response = await anonSelect(request, table, "id");
      expect(response.status()).toBe(200);
      expect(Array.isArray(await response.json())).toBe(true);
    });
  }

  test("profiles는 id·닉네임만 읽을 수 있다", async ({ request }) => {
    expect((await anonSelect(request, "profiles", "id,nickname")).status()).toBe(200);
    const roleResponse = await anonSelect(request, "profiles", "role");
    expect([401, 403]).toContain(roleResponse.status());
  });

  test("applications는 보이지 않는다", async ({ request }) => {
    const response = await anonSelect(request, "applications", "id");
    if (response.ok()) {
      expect(await response.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });

  test("테이블에 직접 쓸 수 없다", async ({ request }) => {
    const insert = await request.post(`${supabaseUrl}/rest/v1/categories`, {
      headers: anonHeaders(),
      data: { slug: "rls-check", name: "권한 확인", sort_order: 99 },
    });
    expect([401, 403]).toContain(insert.status());

    const update = await request.patch(`${supabaseUrl}/rest/v1/socialings?id=gt.0`, {
      headers: anonHeaders(),
      data: { title: "바뀌면 안 됨" },
    });
    expect([401, 403]).toContain(update.status());
  });

  test("사진 버킷에 비로그인으로 올릴 수 없다", async ({ request }) => {
    const upload = await request.post(`${supabaseUrl}/storage/v1/object/review-photos/anon/rls-check.jpg`, {
      headers: { apikey: publishableKey ?? "", "Content-Type": "image/jpeg" },
      data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    });
    expect(upload.ok()).toBe(false);
  });
});
