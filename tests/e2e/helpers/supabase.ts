import { expect, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../../scripts/lib/management-api.mts";
import { DEMO_EMAIL_DOMAIN, DEMO_USERS, type DemoUserKey } from "../../../scripts/seed-data.mts";

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

export type RpcResult = { status: number; body: { id?: number; status?: string; message?: string; code?: string } };

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
  /** 소셜링 일시까지 남은 시간(시간). 음수면 지난 소셜링. 기본은 신청 마감 24시간 뒤. 신청 마감보다 앞서면 안 된다 */
  startsInHours?: number;
  accepted?: DemoUserKey[];
  description?: string;
  staffCount?: number;
  approvalCriteria?: string;
};

/** 테스트 전용 소셜링을 만들고 id를 돌려준다. 제목은 "[E2E]"로 시작한다. */
export async function createFixtureSocialing(options: FixtureOptions): Promise<number> {
  const {
    host,
    capacity = 2,
    joinType = "first_come",
    status = "recruiting",
    deadlineInHours = 24,
    startsInHours = Math.max(deadlineInHours, 0) + 24,
    accepted = [],
    description = "자동 테스트가 만들고 지우는 소셜링",
    staffCount = 0,
    approvalCriteria,
  } = options;
  const title = `[E2E] 테스트 소셜링 ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const acceptedEmails = accepted.map((u) => sqlText(DEMO_USERS[u].email)).join(", ");

  const rows = await runQuery<{ id: number }>(`
    with host as (
      select id from auth.users where email = ${sqlText(DEMO_USERS[host].email)}
    ), inserted as (
      insert into public.socialings
        (host_id, title, description, category_id, has_alcohol, venue_id,
         starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, status)
      select host.id, ${sqlText(title)}, ${sqlText(description)},
        (select id from public.categories where slug = 'learning'), false,
        (select id from public.venues order by id limit 1),
        now() + interval '${startsInHours} hours',
        now() + interval '${deadlineInHours} hours',
        0, ${capacity}, ${staffCount}, '${joinType}', ${approvalCriteria ? sqlText(approvalCriteria) : "null"}, '${status}'
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

/** 테스트 소셜링에 신청 행을 바로 넣고 id를 돌려준다. 함수로는 만들 수 없는 상태(거절, 일시 지난 신청 등)를 준비할 때 쓴다 */
export async function addApplication(
  socialingId: number,
  user: DemoUserKey,
  status: "pending" | "accepted" | "rejected" | "canceled",
): Promise<number> {
  const rows = await runQuery<{ id: number }>(`
    insert into public.applications (socialing_id, user_id, status, decided_at, canceled_at)
    select ${socialingId}, id, '${status}',
      case when '${status}' in ('accepted', 'rejected') then now() end,
      case when '${status}' = 'canceled' then now() end
    from auth.users where email = ${sqlText(DEMO_USERS[user].email)}
    returning id;
  `);
  const id = rows[0]?.id;
  if (!id) throw new Error("테스트 신청을 만들지 못했습니다.");
  return id;
}

/**
 * 테스트 소셜링을 바로 바꾼다. 창을 연 사이 다른 일이 생긴 경우(호스트 취소, 신청 마감, 호스트가 바뀜)를 만든다.
 * 테스트 전용 [E2E] 소셜링만 바꾼다.
 */
export async function updateFixtureSocialing(
  socialingId: number,
  change: {
    status?: "recruiting" | "confirmed" | "completed" | "canceled";
    deadlineInHours?: number;
    /** 소셜링 일시. 신청 마감 일시는 그보다 늦을 수 없어 함께 옮긴다 (deadlineInHours가 없으면 일시 1시간 전) */
    startsInHours?: number;
    /** 호스트를 바꾼다. 보는 사람이 그 소셜링의 호스트가 된 경우(IS_HOST)를 만든다 */
    host?: DemoUserKey;
  },
) {
  const deadline = change.deadlineInHours ?? (change.startsInHours !== undefined ? change.startsInHours - 1 : undefined);
  const sets = [
    change.status ? `status = '${change.status}'` : null,
    deadline !== undefined ? `apply_deadline_at = now() + interval '${deadline} hours'` : null,
    change.startsInHours !== undefined ? `starts_at = now() + interval '${change.startsInHours} hours'` : null,
    change.host
      ? `host_id = (select id from auth.users where email = ${sqlText(DEMO_USERS[change.host].email)})`
      : null,
  ].filter(Boolean);
  if (sets.length === 0) return;
  await runQuery(
    `update public.socialings set ${sets.join(", ")} where id = ${socialingId} and title like '[E2E]%';`,
  );
}

/** 테스트 소셜링에 user의 인증 후기를 바로 넣는다 (소셜링을 지우면 함께 지워진다) */
export async function addReview(socialingId: number, user: DemoUserKey) {
  await runQuery(`
    insert into public.reviews (socialing_id, user_id, body)
    select ${socialingId}, id, '자동 테스트가 넣은 인증 후기입니다.'
    from auth.users where email = ${sqlText(DEMO_USERS[user].email)};
  `);
}

/** 로그인한 user 권한으로 뷰를 읽는다. 상태 코드와 행을 돌려준다 */
export async function readAs<T>(
  request: APIRequestContext,
  path: string,
  accessToken?: string,
): Promise<{ status: number; rows: T[] }> {
  const response = await request.get(`${supabaseUrl}/rest/v1/${path}`, { headers: apiHeaders(accessToken) });
  const body = await response.json();
  return { status: response.status(), rows: Array.isArray(body) ? body : [] };
}

export async function applicationsOf(socialingId: number) {
  return runQuery<{ email: string; status: string }>(`
    select u.email, a.status from public.applications a
    join auth.users u on u.id = a.user_id
    where a.socialing_id = ${socialingId}
    order by a.id;
  `);
}

/** 소셜링의 지금 상태와 상태가 바뀐 시각 (호스트 함수가 바꾼 결과를 본다) */
export async function socialingStateOf(socialingId: number) {
  const rows = await runQuery<{
    status: string;
    confirmed_at: string | null;
    completed_at: string | null;
    canceled_at: string | null;
  }>(`select status, confirmed_at, completed_at, canceled_at from public.socialings where id = ${socialingId};`);
  return rows[0];
}

/**
 * DB 안에서 user로 apply_to_socialing을 부르고, 커밋하기 전에 holdSeconds만큼 붙잡고 있는다.
 * 두 신청이 확실히 겹치게 만들어 잠금이 정원을 지키는지 본다. 성공하면 "OK", 실패하면 오류 코드.
 */
export async function applyInDbHolding(socialingId: number, user: DemoUserKey, holdSeconds: number): Promise<string> {
  return callInDbHolding(user, `public.apply_to_socialing(${socialingId})`, holdSeconds);
}

/** applyInDbHolding과 같게, user로 함수 호출 하나(`public.fn(...)`)를 부르고 커밋 전에 붙잡고 있는다 */
export async function callInDbHolding(user: DemoUserKey, call: string, holdSeconds: number): Promise<string> {
  try {
    await runQuery(`
      begin;
      select set_config('request.jwt.claims',
        json_build_object('sub', (select id from auth.users where email = ${sqlText(DEMO_USERS[user].email)}), 'role', 'authenticated')::text,
        true);
      set local role authenticated;
      select ${call};
      select pg_sleep(${holdSeconds});
      commit;
    `);
    return "OK";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = /\b(FULL|ALREADY_APPLIED|ALREADY_PROCESSED|DEADLINE_PASSED|HOST_CANCELED|IS_HOST|NOT_OPEN)\b/.exec(message);
    return code ? code[1] : message;
  }
}

/** 가입 테스트가 만든 계정을 지운다. 데모 도메인 계정만 지운다 (profiles는 on delete cascade) */
export async function deleteAuthUsers(emails: string[]) {
  const targets = emails.filter((email) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`));
  if (targets.length === 0) return;
  await runQuery(`delete from auth.users where email in (${targets.map(sqlText).join(", ")});`);
}
