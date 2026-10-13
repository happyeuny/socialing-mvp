// npm run seed
// dev 프로젝트의 데모 데이터를 모두 지우고 다시 넣는다 (architecture 7장 시드, spec 7장).
// SUPABASE_SECRET_KEY는 이 파일에서만 쓴다. 키·비밀번호 값은 출력하지 않는다.
//
// 데모 계정 비밀번호: DEMO_PASSWORD 환경 변수. 없으면 새로 만들어 .env.local에 저장한다
// (저장소는 공개라 비밀번호를 코드에 두지 않는다).

import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types.ts";
import {
  CATEGORIES,
  DEMO_EMAIL_DOMAIN,
  DEMO_USERS,
  REGIONS,
  VENUES,
  demoSocialings,
  type DemoUserKey,
} from "./seed-data.mts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}이(가) 없습니다.`);
  return value;
}

const supabase = createClient<Database>(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SECRET_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
);

/** 오류면 멈추고, 돌려받은 행을 준다 */
function check<T>(label: string, result: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${label}: 결과가 비어 있습니다.`);
  return result.data as NonNullable<T>;
}

/** 돌려받을 행이 없는 작업(삭제, 결과 없는 추가) */
function ok(label: string, result: { error: { message: string } | null }) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
}

async function demoPassword(): Promise<string> {
  const fromEnv = process.env.DEMO_PASSWORD;
  if (fromEnv) return fromEnv;
  const generated = `demo-${randomBytes(9).toString("base64url")}`;
  await appendFile(".env.local", `\nDEMO_PASSWORD=${generated}\n`, "utf8");
  console.log("DEMO_PASSWORD가 없어서 새로 만들어 .env.local에 저장했습니다(값은 출력하지 않음).");
  return generated;
}

/** 데모 데이터 전부 삭제. 순서: 신청·후기 → 소셜링 → 장소·지역·카테고리 → 데모 계정 */
async function wipe() {
  // review_checks는 reviews 삭제 때 함께 지워진다 (on delete cascade)
  for (const table of ["reviews", "applications", "socialings", "venues", "regions", "categories"] as const) {
    ok(`${table} 삭제`, await supabase.from(table).delete().gte("id", 0));
  }

  let page = 1;
  const demoUserIds: string[] = [];
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`사용자 목록: ${error.message}`);
    demoUserIds.push(
      ...data.users.filter((u) => u.email?.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).map((u) => u.id),
    );
    if (data.users.length < 1000) break;
    page += 1;
  }
  for (const id of demoUserIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw new Error(`사용자 삭제: ${error.message}`);
  }
}

async function createDemoUsers(password: string): Promise<Record<DemoUserKey, string>> {
  const ids = {} as Record<DemoUserKey, string>;
  for (const [key, user] of Object.entries(DEMO_USERS) as [DemoUserKey, (typeof DEMO_USERS)[DemoUserKey]][]) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true, // 이메일 인증 완료 상태 (Confirm email 설정과 무관하게 바로 로그인)
      user_metadata: { nickname: user.nickname },
    });
    if (error) throw new Error(`데모 계정 ${key} 생성: ${error.message}`);
    ids[key] = data.user.id;
  }
  return ids;
}

async function main() {
  const startedAt = Date.now();
  const now = new Date();
  const password = await demoPassword();

  await wipe();
  const userIds = await createDemoUsers(password);

  const categories = check("카테고리", await supabase.from("categories").insert([...CATEGORIES]).select("id, slug"));
  const categoryId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const regions = check("지역", await supabase.from("regions").insert([...REGIONS]).select("id, code"));
  const regionId = Object.fromEntries(regions.map((r) => [r.code, r.id]));

  const venues = check(
    "장소",
    await supabase
      .from("venues")
      .insert(VENUES.map((v) => ({ type: v.type, name: v.name, region_id: regionId[v.region], address_text: v.address_text })))
      .select("id, name"),
  );
  const venueId = Object.fromEntries(VENUES.map((v) => [v.key, venues.find((row) => row.name === v.name)!.id]));

  const socialings = demoSocialings(now);
  for (const s of socialings) {
    const { data: inserted, error: insertError } = await supabase
      .from("socialings")
      .insert({
        host_id: userIds[s.host],
        title: s.title,
        description: s.description,
        category_id: categoryId[s.category],
        has_alcohol: s.has_alcohol,
        venue_id: venueId[s.venue],
        starts_at: s.starts_at,
        apply_deadline_at: s.apply_deadline_at,
        fee: s.fee,
        capacity: s.capacity,
        staff_count: s.staff_count,
        join_type: s.join_type,
        approval_criteria: s.approval_criteria ?? null,
        status: s.status,
        confirmed_at: s.confirmed_at ?? null,
        completed_at: s.completed_at ?? null,
        canceled_at: s.canceled_at ?? null,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(`소셜링 ${s.key}: ${insertError.message}`);
    if (s.applications.length > 0) {
      ok(
        `소셜링 ${s.key} 신청`,
        await supabase.from("applications").insert(
          s.applications.map((a) => ({
            socialing_id: inserted.id,
            user_id: userIds[a.user],
            status: a.status,
            created_at: a.created_at,
            decided_at: a.status === "pending" ? null : a.created_at,
          })),
        ),
      );
    }
  }

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `시드 완료 (${seconds}초): 데모 계정 ${Object.keys(userIds).length}개, 카테고리 ${categories.length}개, 지역 ${regions.length}개, 장소 ${venues.length}개, 소셜링 ${socialings.length}개`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
