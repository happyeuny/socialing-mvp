import { expect, test } from "@playwright/test";
import {
  DEMO_USERS,
  REGIONS,
  VENUES,
  demoSocialings,
  hostRecordFromSeed,
  seedSocialings,
} from "../../scripts/seed-data.mts";

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
    // 파티·사교를 숨겨도 남는 술 자리 → "술 없음" 필터와 "파티·사교 숨기기"의 결과가 갈린다 (MS12 U2)
    has("술 있는 배움(모집중, 일시 미래)", (s) => s.has_alcohol && s.category === "learning" && s.status === "recruiting" && future(s));
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
    // 다른 E2E가 잠깐 만드는 "[E2E]" 소셜링과 거기 넣은 후기는 세지 않는다
    const isFixture = (title: string) => title.startsWith("[E2E]");
    expect(socialings.filter((s) => !isFixture(s.title)).length).toBe(definitions.length);

    const reviews: { socialing: { title: string } }[] = await (
      await request.get(`${supabaseUrl}/rest/v1/reviews?select=socialing:socialings(title)`, { headers })
    ).json();
    expect(reviews.filter((r) => !isFixture(r.socialing.title)).length).toBe(
      definitions.flatMap((s) => s.reviews ?? []).length,
    );

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

  test("MS14 2묶음 시드: 유료는 모두 참가비 설명, 필름 카메라는 승인 기준·연령 조건·서윤 거절, 배움 3개에 자료 링크", async ({
    request,
  }) => {
    const paid = definitions.filter((s) => s.fee > 0);
    expect(paid).toHaveLength(21);
    for (const s of paid) {
      expect(s.fee_note?.trim(), `${s.title}: 참가비 설명`).toBeTruthy();
      expect(s.fee_note!.length, `${s.title}: 100자까지`).toBeLessThanOrEqual(100);
    }
    // 현장에서 따로 내는 돈을 적은 소셜링이 있다 (03 9장)
    expect(paid.filter((s) => s.fee_note!.includes("현장에서 각자")).length).toBeGreaterThanOrEqual(2);
    // 호스트 승인 소셜링은 모두 승인 기준이 있다 (U5)
    for (const s of definitions.filter((d) => d.join_type === "approval")) {
      expect(s.approval_criteria?.trim(), `${s.title}: 승인 기준`).toBeTruthy();
    }
    const withMaterial = definitions.filter((s) => s.material_url);
    expect(withMaterial.map((s) => s.key).sort()).toEqual(["B_LEARNING_LATER", "C_ONE_SEAT_LEFT", "D_CONFIRMED"]);
    for (const s of withMaterial) {
      expect(s.category).toBe("learning");
      expect(s.material_url).toMatch(/^https:\/\/ko\.wikipedia\.org\/wiki\//);
    }

    // DB: 필름 카메라(하린, 호스트 승인)
    const hobby = definitions.find((s) => s.key === "C_HOBBY")!;
    const [row] = await (
      await request.get(
        `${supabaseUrl}/rest/v1/socialing_summaries?select=id,join_type,approval_criteria,min_age,max_age,fee_note,accepted_count,can_apply&title=eq.${encodeURIComponent(hobby.title)}`,
        { headers },
      )
    ).json();
    expect(row).toMatchObject({
      join_type: "approval",
      approval_criteria: hobby.approval_criteria,
      min_age: 20,
      max_age: 39,
      fee_note: hobby.fee_note,
      accepted_count: 0,
      can_apply: true,
    });

    // 서윤의 가장 최근 신청은 거절 + 사유 (F4). 자리가 남아 있어 다시 신청할 수 있다
    const token = await signIn(request, DEMO_USERS.A.email);
    const applied = await (
      await request.get(
        `${supabaseUrl}/rest/v1/my_applied_socialings?select=application_status,reject_reason,reject_note&id=eq.${row.id}`,
        { headers: { ...headers, Authorization: `Bearer ${token}` } },
      )
    ).json();
    expect(applied).toEqual([
      {
        application_status: "rejected",
        reject_reason: "criteria",
        reject_note: "이번에는 사진을 많이 찍어 볼 분들로 모셨어요. 다음에 함께해요!",
      },
    ]);

    // 유료 시드 소셜링은 DB에서도 모두 참가비 설명이 있고, 자료 링크는 정의한 3개뿐
    const rows: { title: string; fee: number; fee_note: string | null; material_url: string | null }[] = await (
      await request.get(`${supabaseUrl}/rest/v1/socialings?select=title,fee,fee_note,material_url`, { headers })
    ).json();
    const seeded = rows.filter((r) => !r.title.startsWith("[E2E]"));
    for (const r of seeded.filter((s) => s.fee > 0)) {
      expect(r.fee_note, r.title).toBe(definitions.find((s) => s.title === r.title)!.fee_note);
    }
    expect(seeded.filter((r) => r.material_url).map((r) => r.title).sort()).toEqual(
      withMaterial.map((s) => s.title).sort(),
    );
  });

  test("지역은 전국 시·도 16개 > 시·군·구 256곳이고, 장소는 정의한 구에 있다 (MS6 지역 필터)", async ({ request }) => {
    const regions: { code: string; sido: string; sigungu: string }[] = await (
      await request.get(`${supabaseUrl}/rest/v1/regions?select=code,sido,sigungu`, { headers })
    ).json();
    expect(regions).toHaveLength(256);
    expect(new Set(regions.map((r) => r.sido)).size).toBe(16);
    expect(new Set(regions.map((r) => r.code)).size).toBe(256);
    // 일반구가 있는 시는 "시 구"로 (시만 있는 행은 없다)
    expect(regions.find((r) => r.code === "41117")).toMatchObject({ sido: "경기도", sigungu: "수원시 영통구" });
    expect(regions.some((r) => r.sido === "경기도" && r.sigungu === "수원시")).toBe(false);

    const venues: { name: string; type: string; regions: { sido: string; sigungu: string } }[] = await (
      await request.get(`${supabaseUrl}/rest/v1/venues?select=name,type,regions(sido,sigungu)`, { headers })
    ).json();
    for (const venue of VENUES) {
      const row = venues.find((v) => v.name === venue.name);
      const expected = REGIONS.find((r) => r.code === venue.region)!;
      expect(row?.regions, venue.name).toEqual({ sido: expected.sido, sigungu: expected.sigungu });
    }
  });
});
