import { expect, test } from "@playwright/test";
import { DEMO_USERS, demoSocialings } from "../../scripts/seed-data.mts";

// SP4: 데모 계정 로그인과 상대 날짜 (tasks MS1 완료 기준). `npm run seed` 뒤에 돌린다.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const headers = { apikey: publishableKey, "Content-Type": "application/json" };

test.describe("SP4 시드", () => {
  for (const [key, user] of Object.entries(DEMO_USERS)) {
    test(`데모 계정 ${key}(${user.nickname})로 로그인할 수 있다`, async ({ request }) => {
      const password = process.env.DEMO_PASSWORD;
      expect(password, "DEMO_PASSWORD가 환경 변수나 .env.local에 있어야 합니다").toBeTruthy();

      const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        headers,
        data: { email: user.email, password },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.user.email).toBe(user.email);
    });
  }

  test("소셜링 날짜가 시드 실행 시점 기준 상대값이다", async ({ request }) => {
    const response = await request.get(
      `${supabaseUrl}/rest/v1/socialings?select=title,status,starts_at,apply_deadline_at,created_at`,
      { headers },
    );
    expect(response.status()).toBe(200);
    const rows: { title: string; status: string; starts_at: string; apply_deadline_at: string; created_at: string }[] =
      await response.json();

    for (const expected of demoSocialings()) {
      const row = rows.find((r) => r.title === expected.title);
      expect(row, `${expected.key} 소셜링이 있어야 합니다`).toBeTruthy();
      if (!row) continue;
      expect(row.status).toBe(expected.status);

      // 시드한 시점(created_at)을 기준으로 다시 계산한 날짜와 같아야 한다
      const expectedAtSeed = demoSocialings(new Date(row.created_at)).find((s) => s.key === expected.key)!;
      expect(new Date(row.starts_at).getTime()).toBe(new Date(expectedAtSeed.starts_at).getTime());
    }

    const now = Date.now();
    const byKey = (key: string) => rows.find((r) => r.title === demoSocialings().find((s) => s.key === key)!.title)!;
    expect(new Date(byKey("X").starts_at).getTime()).toBeLessThan(now); // 일시가 지난 확정 소셜링
    expect(new Date(byKey("APPROVAL").starts_at).getTime()).toBeGreaterThan(now); // 4~6단계는 미래
    expect(new Date(byKey("APPROVAL").apply_deadline_at).getTime()).toBeGreaterThan(now);
  });
});
