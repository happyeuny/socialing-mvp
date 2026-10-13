import { expect, test } from "@playwright/test";
import { DEMO_USERS, demoSocialings, hostRecordFromSeed, seedSocialings } from "../../scripts/seed-data.mts";

// 시드 (SP4 + 시드 전체): 데모 계정 로그인, 상대 날짜, spec 7장 시드 조건. `npm run seed` 뒤에 돌린다.

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

async function signIn(request: import("@playwright/test").APIRequestContext, email: string) {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers,
    data: { email, password: process.env.DEMO_PASSWORD },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).access_token as string;
}

test.describe("시드 조건 (spec 7장)", () => {
  const definitions = seedSocialings();

  test("호스트 B는 새 호스트가 아니고 등급 조건을 채운다", () => {
    const b = hostRecordFromSeed(definitions, "B");
    expect(b.isNewHost).toBe(false);
    expect(b.opened).toBeGreaterThanOrEqual(5);
    expect(b.canceled).toBe(0);
    expect(b.responses).toBeGreaterThanOrEqual(5);
    expect(b.isTrusted).toBe(true);
  });

  test("다른 호스트 중 하나는 새 호스트, 하나는 기록 숫자만 있고 등급 없음", () => {
    expect(hostRecordFromSeed(definitions, "C").isNewHost).toBe(true);
    const d = hostRecordFromSeed(definitions, "D");
    expect(d.isNewHost).toBe(false);
    expect(d.isTrusted).toBe(false);
  });

  test("상태별 소셜링과 카테고리·술·장소 조건이 정의에 모두 있다", () => {
    const now = Date.now();
    const accepted = (s: (typeof definitions)[number]) => s.applications.filter((a) => a.status === "accepted").length;
    const future = (s: (typeof definitions)[number]) => new Date(s.starts_at).getTime() > now;
    const has = (label: string, predicate: (s: (typeof definitions)[number]) => boolean) =>
      expect(definitions.some(predicate), label).toBe(true);

    has("모집중(미래)", (s) => s.status === "recruiting" && future(s) && new Date(s.apply_deadline_at).getTime() > now);
    has("확정(미래)", (s) => s.status === "confirmed" && future(s));
    has("신청 마감", (s) => s.status === "recruiting" && future(s) && new Date(s.apply_deadline_at).getTime() < now);
    has("정원 마감", (s) => s.status === "recruiting" && future(s) && accepted(s) === s.capacity);
    has("종료", (s) => s.status === "completed");
    has("호스트 취소", (s) => s.status === "canceled");
    has("확정 안 된 채 일시 지남", (s) => s.status === "recruiting" && !future(s));
    has("파티·사교(취소 아님)", (s) => s.category === "party" && s.status !== "canceled");
    has("술 있음", (s) => s.has_alcohol);
    has("외부 장소", (s) => ["yeonnam_cafe", "seongsu_studio", "yeoksam_lounge", "jamsil_court"].includes(s.venue));

    const learning = definitions.filter((s) => s.category === "learning").length;
    expect(learning, "배움 위주").toBeGreaterThan(definitions.length / 2);
    expect(new Set(definitions.map((s) => s.category)).size).toBe(5);
    for (const s of definitions) {
      expect(accepted(s), `${s.title}: 참여 확정 인원 ≤ 정원`).toBeLessThanOrEqual(s.capacity);
      expect(new Date(s.apply_deadline_at) <= new Date(s.starts_at), `${s.title}: 마감 ≤ 일시`).toBe(true);
    }
  });

  test("DB에 정의한 만큼 들어가 있다", async ({ request }) => {
    const socialings: { title: string }[] = await (
      await request.get(`${supabaseUrl}/rest/v1/socialings?select=title`, { headers })
    ).json();
    // 다른 E2E가 잠깐 만드는 "[E2E]" 소셜링은 세지 않는다
    expect(socialings.filter((s) => !s.title.startsWith("[E2E]")).length).toBe(definitions.length);

    const reviews = await (await request.get(`${supabaseUrl}/rest/v1/reviews?select=id`, { headers })).json();
    expect(reviews.length).toBe(definitions.flatMap((s) => s.reviews ?? []).length);

    // 정원 마감 소셜링: 호스트로 로그인하면 신청을 볼 수 있고, 참여 확정 인원이 정원과 같다
    const full = definitions.find((s) => s.key === "D_FULL")!;
    const token = await signIn(request, DEMO_USERS.D.email);
    const [row] = await (
      await request.get(`${supabaseUrl}/rest/v1/socialings?select=id,capacity&title=eq.${encodeURIComponent(full.title)}`, {
        headers,
      })
    ).json();
    const acceptedRows = await (
      await request.get(`${supabaseUrl}/rest/v1/applications?select=id&status=eq.accepted&socialing_id=eq.${row.id}`, {
        headers: { ...headers, Authorization: `Bearer ${token}` },
      })
    ).json();
    expect(acceptedRows.length).toBe(row.capacity);
  });
});
