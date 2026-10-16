// npm run seed
// dev 프로젝트의 데모 데이터를 모두 지우고 다시 넣는다 (architecture 7장 시드, spec 7장).
// SUPABASE_SECRET_KEY는 이 파일에서만 쓴다. 키·비밀번호 값은 출력하지 않는다.
//
// 데모 계정 비밀번호: DEMO_PASSWORD 환경 변수. 없으면 새로 만들어 .env.local에 저장한다
// (저장소는 공개라 비밀번호를 코드에 두지 않는다).
//
// 대표 사진·후기 사진: scripts/seed-assets/ (AI 생성 이미지, 출처는 SOURCES.md). 받은 그대로 올린다.

import { randomBytes } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types.ts";
import {
  CATEGORIES,
  DEMO_EMAIL_DOMAIN,
  DEMO_USERS,
  REGIONS,
  VENUES,
  seedSocialings,
  type DemoUserKey,
  type SeedSocialing,
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

const SEED_ASSETS = new URL("./seed-assets/", import.meta.url);

/** 시드 정의가 쓰는 사진 파일을 모두 읽는다. 지우기 전에 불러서, 파일이 빠졌으면 아무것도 지우지 않고 멈춘다 */
async function readSeedPhotos(socialings: SeedSocialing[]): Promise<Map<string, Buffer>> {
  const files = new Set(
    socialings
      .flatMap((s) => [s.cover_photo, ...(s.reviews ?? []).map((r) => r.photo)])
      .filter((file): file is string => Boolean(file)),
  );
  const photos = new Map<string, Buffer>();
  for (const file of files) {
    try {
      photos.set(file, await readFile(new URL(file, SEED_ASSETS)));
    } catch {
      throw new Error(`시드 사진 scripts/seed-assets/${file}이(가) 없습니다.`);
    }
  }
  return photos;
}

/** 사진을 그 사람 폴더(`<사용자 id>/<파일 이름>`, 앱이 올리는 폴더 규칙과 같음)에 올리고 경로를 돌려준다 */
async function uploadPhoto(
  bucket: "socialing-photos" | "review-photos",
  userId: string,
  file: string,
  photos: Map<string, Buffer>,
): Promise<string> {
  const path = `${userId}/${file}`;
  ok(`${bucket}/${file} 올리기`, await supabase.storage.from(bucket).upload(path, photos.get(file)!, { contentType: "image/jpeg" }));
  return path;
}

/** 데모 데이터 전부 삭제. 순서: 사진 → 신청·후기 → 소셜링 → 장소·지역·카테고리 → 데모 계정 */
async function wipe() {
  // 사진 버킷을 비운다 (지난 시드, 테스트, 실기기 확인에서 올린 사진). SQL로는 지울 수 없어 Storage API로 지운다
  for (const bucket of ["socialing-photos", "review-photos"]) {
    ok(`${bucket} 비우기`, await supabase.storage.emptyBucket(bucket));
  }

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

  const socialings = seedSocialings(now);
  const titles = new Set(socialings.map((s) => s.title));
  if (titles.size !== socialings.length) throw new Error("시드 소셜링 제목이 겹칩니다(제목으로 행을 찾음).");
  const photos = await readSeedPhotos(socialings);

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

  // 대표 사진은 호스트 폴더에 (한꺼번에 올림)
  const coverPaths = await Promise.all(
    socialings.map((s) => (s.cover_photo ? uploadPhoto("socialing-photos", userIds[s.host], s.cover_photo, photos) : null)),
  );

  const insertedSocialings = check(
    "소셜링",
    await supabase
      .from("socialings")
      .insert(
        socialings.map((s, i) => ({
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
          cover_photo_path: coverPaths[i],
        })),
      )
      .select("id, title"),
  );
  const socialingId = Object.fromEntries(insertedSocialings.map((row) => [row.title, row.id]));

  const applications = socialings.flatMap((s) =>
    s.applications.map((a) => ({
      socialing_id: socialingId[s.title],
      user_id: userIds[a.user],
      status: a.status,
      created_at: a.created_at,
      decided_at: a.status === "pending" ? null : a.created_at,
      canceled_at: a.status === "canceled" ? a.created_at : null,
    })),
  );
  ok("신청", await supabase.from("applications").insert(applications));

  const reviewRows = socialings.flatMap((s) => (s.reviews ?? []).map((r) => ({ socialing: s, review: r })));
  // 후기 사진은 쓴 사람 폴더에
  const reviewPhotoPaths = await Promise.all(
    reviewRows.map(({ review }) => (review.photo ? uploadPhoto("review-photos", userIds[review.user], review.photo, photos) : null)),
  );
  const insertedReviews = check(
    "후기",
    await supabase
      .from("reviews")
      .insert(
        reviewRows.map(({ socialing, review }, i) => ({
          socialing_id: socialingId[socialing.title],
          user_id: userIds[review.user],
          body: review.body,
          photo_path: reviewPhotoPaths[i],
          created_at: review.created_at,
        })),
      )
      .select("id, socialing_id, user_id"),
  );
  ok(
    "비공개 응답",
    await supabase.from("review_checks").insert(
      reviewRows.map(({ socialing, review }) => {
        const row = insertedReviews.find(
          (r) => r.socialing_id === socialingId[socialing.title] && r.user_id === userIds[review.user],
        )!;
        const [members_match, extra_money, content_match] = review.checks;
        return { review_id: row.id, members_match, extra_money, content_match };
      }),
    ),
  );

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `시드 완료 (${seconds}초): 데모 계정 ${Object.keys(userIds).length}개, 카테고리 ${categories.length}개, 지역 ${regions.length}개, 장소 ${venues.length}개, 소셜링 ${socialings.length}개, 신청 ${applications.length}개, 후기 ${insertedReviews.length}개, 대표 사진 ${coverPaths.filter(Boolean).length}장, 후기 사진 ${reviewPhotoPaths.filter(Boolean).length}장`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
