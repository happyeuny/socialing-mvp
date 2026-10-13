import { expect, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../../scripts/lib/management-api.mts";
import { DEMO_USERS, type DemoUserKey } from "../../../scripts/seed-data.mts";

// E2E 도우미: Supabase REST를 데모 계정으로 부르고, 테스트 전용 소셜링을 만들고 지운다.
// 테스트 데이터는 Management API(SUPABASE_ACCESS_TOKEN)로 만들고 지워서 시드 데이터는 건드리지 않는다.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function apiHeaders(accessToken?: string) {
  return {
    apikey: publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function signIn(request: APIRequestContext, user: DemoUserKey): Promise<string> {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: apiHeaders(),
    data: { email: DEMO_USERS[user].email, password: process.env.DEMO_PASSWORD },
  });
  expect(response.status(), `${user} 로그인`).toBe(200);
  return (await response.json()).access_token;
}

export type RpcResult = { status: number; body: { status?: string; message?: string; code?: string } };

export async function rpc(
  request: APIRequestContext,
  fn: string,
  args: Record<string, unknown>,
  accessToken?: string,
): Promise<RpcResult> {
  const response = await request.post(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    headers: apiHeaders(accessToken),
    data: args,
  });
  return { status: response.status(), body: await response.json() };
}

const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`;

export type FixtureOptions = {
  host: DemoUserKey;
  capacity?: number;
  joinType?: "first_come" | "approval";
  status?: "recruiting" | "confirmed" | "completed" | "canceled";
  /** 신청 마감까지 남은 시간(시간). 음수면 이미 지남 */
  deadlineInHours?: number;
  accepted?: DemoUserKey[];
};

/** 테스트 전용 소셜링을 만들고 id를 돌려준다. 제목은 "[E2E]"로 시작한다. */
export async function createFixtureSocialing(options: FixtureOptions): Promise<number> {
  const {
    host,
    capacity = 2,
    joinType = "first_come",
    status = "recruiting",
    deadlineInHours = 24,
    accepted = [],
  } = options;
  const title = `[E2E] 테스트 소셜링 ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const acceptedEmails = accepted.map((u) => sqlText(DEMO_USERS[u].email)).join(", ");

  const rows = await runQuery<{ id: number }>(`
    with host as (
      select id from auth.users where email = ${sqlText(DEMO_USERS[host].email)}
    ), inserted as (
      insert into public.socialings
        (host_id, title, description, category_id, has_alcohol, venue_id,
         starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, status)
      select host.id, ${sqlText(title)}, '자동 테스트가 만들고 지우는 소셜링',
        (select id from public.categories where slug = 'learning'), false,
        (select id from public.venues order by id limit 1),
        now() + interval '${Math.max(deadlineInHours, 0) + 24} hours',
        now() + interval '${deadlineInHours} hours',
        0, ${capacity}, 0, '${joinType}', '${status}'
      from host
      returning id
    )
    select id from inserted;
  `);
  const id = rows[0]?.id;
  if (!id) throw new Error("테스트 소셜링을 만들지 못했습니다(데모 계정이 없으면 npm run seed).");

  if (accepted.length > 0) {
    await runQuery(`
      insert into public.applications (socialing_id, user_id, status, decided_at)
      select ${id}, id, 'accepted', now() from auth.users where email in (${acceptedEmails});
    `);
  }
  return id;
}

export async function deleteFixtureSocialings(ids: number[]) {
  if (ids.length === 0) return;
  // applications는 on delete cascade로 함께 지워진다
  await runQuery(`delete from public.socialings where id in (${ids.join(", ")}) and title like '[E2E]%';`);
}

export async function applicationsOf(socialingId: number) {
  return runQuery<{ email: string; status: string }>(`
    select u.email, a.status from public.applications a
    join auth.users u on u.id = a.user_id
    where a.socialing_id = ${socialingId}
    order by a.id;
  `);
}

/**
 * DB 안에서 user로 apply_to_socialing을 부르고, 커밋하기 전에 holdSeconds만큼 붙잡고 있는다.
 * 두 신청이 확실히 겹치게 만들어 잠금이 정원을 지키는지 본다. 성공하면 "OK", 실패하면 오류 코드.
 */
export async function applyInDbHolding(socialingId: number, user: DemoUserKey, holdSeconds: number): Promise<string> {
  try {
    await runQuery(`
      begin;
      select set_config('request.jwt.claims',
        json_build_object('sub', (select id from auth.users where email = ${sqlText(DEMO_USERS[user].email)}), 'role', 'authenticated')::text,
        true);
      set local role authenticated;
      select public.apply_to_socialing(${socialingId});
      select pg_sleep(${holdSeconds});
      commit;
    `);
    return "OK";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = /\b(FULL|ALREADY_APPLIED|DEADLINE_PASSED|HOST_CANCELED|IS_HOST|NOT_OPEN)\b/.exec(message);
    return code ? code[1] : message;
  }
}
