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

/** 테스트가 가입시킨 계정 (`e2e-…@socialing.test`). 끝에 deleteAuthUsers로 지운다 */
export type TestUser = { id: string; email: string; nickname: string; accessToken: string; password: string };

/**
 * 테스트 전용 계정을 가입시킨다(이메일 인증이 꺼져 있어 바로 로그인된다).
 * 다른 테스트가 시드 계정으로 만드는 소셜링과 섞이지 않아야 하는 경우(호스트 기록 숫자 등)에 쓴다.
 */
export async function createTestUser(request: APIRequestContext, label: string): Promise<TestUser> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const email = `e2e-${label}-${suffix}@${DEMO_EMAIL_DOMAIN}`;
  const nickname = `t${suffix}`.slice(0, 12);
  const password = `e2e-${suffix}-pw`;
  const response = await request.post(`${supabaseUrl}/auth/v1/signup`, {
    headers: apiHeaders(),
    data: { email, password, data: { nickname } },
  });
  expect(response.status(), "테스트 계정 가입").toBe(200);
  const body = await response.json();
  return { id: body.user.id, email, nickname, accessToken: body.access_token, password };
}

const emailOf = (user: DemoUserKey | TestUser) => (typeof user === "string" ? DEMO_USERS[user].email : user.email);

export type FixtureOptions = {
  /** 호스트. 시드 데모 계정 또는 테스트가 가입시킨 계정 */
  host: DemoUserKey | TestUser;
  capacity?: number;
  joinType?: "first_come" | "approval";
  status?: "recruiting" | "confirmed" | "completed" | "canceled";
  /** 신청 마감까지 남은 시간(시간). 음수면 이미 지남 */
  deadlineInHours?: number;
  /** 소셜링 일시까지 남은 시간(시간). 음수면 지난 소셜링. 기본은 신청 마감 24시간 뒤. 신청 마감보다 앞서면 안 된다 */
  startsInHours?: number;
  /**
   * 확정 기한까지 남은 시간(시간, MS15 U4). 기본은 신청 마감과 같다. 신청 마감 ≤ 확정 기한 ≤ 소셜링 일시여야 한다.
   * 직접 넣으므로 12시간 검사(등록 함수)에 걸리지 않는다 → 확정 대기·지난 확정 기한을 만들 수 있다
   */
  confirmInHours?: number;
  /** 최소 인원 (MS15 U4). 기본 2, 정원까지 */
  minParticipants?: number;
  accepted?: DemoUserKey[];
  description?: string;
  staffCount?: number;
  approvalCriteria?: string;
  /** 총 참가비(원). 기본 0 */
  fee?: number;
  /** 참가비 설명 (MS14 U3). 기본 없음 */
  feeNote?: string;
  /** 연령 조건 (MS14 SH1b). 기본 없음 */
  minAge?: number;
  maxAge?: number;
  /** 자료 링크 (MS14 SH3). 기본 없음 */
  materialUrl?: string;
  /** 제목에서 "[E2E]" 뒤. 주면 제목이 "[E2E]<titleTail>"(40자까지)가 된다. 기본은 "[E2E] 테스트 소셜링 <시각>" */
  titleTail?: string;
  /** 주면 이 이름의 외부 장소를 만들어 쓴다("[E2E]"로 시작, 40자까지. 끝에 deleteTestVenues). 기본은 첫 장소 */
  externalPlaceName?: string;
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
    confirmInHours = deadlineInHours,
    minParticipants = 2,
    accepted = [],
    description = "자동 테스트가 만들고 지우는 소셜링",
    staffCount = 0,
    approvalCriteria,
    fee = 0,
    feeNote,
    minAge,
    maxAge,
    materialUrl,
    titleTail,
    externalPlaceName,
  } = options;
  const sqlOrNull = (value: string | number | undefined) =>
    value === undefined ? "null" : typeof value === "number" ? String(Math.trunc(value)) : sqlText(value);
  const title =
    titleTail !== undefined ? `[E2E]${titleTail}` : `[E2E] 테스트 소셜링 ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (externalPlaceName !== undefined && !externalPlaceName.startsWith("[E2E]")) {
    throw new Error('테스트 외부 장소 이름은 "[E2E]"로 시작해야 지울 수 있습니다.');
  }
  const acceptedEmails = accepted.map((u) => sqlText(DEMO_USERS[u].email)).join(", ");

  const rows = await runQuery<{ id: number }>(`
    with host as (
      select id from auth.users where email = ${sqlText(emailOf(host))}
    ), place as (
      ${
        externalPlaceName !== undefined
          ? `insert into public.venues (type, name, region_id)
             select 'external', ${sqlText(externalPlaceName)}, (select region_id from public.venues order by id limit 1)
             returning id`
          : "select id from public.venues order by id limit 1"
      }
    ), inserted as (
      insert into public.socialings
        (host_id, title, description, category_id, has_alcohol, venue_id,
         starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, status,
         fee_note, min_age, max_age, material_url, confirm_deadline_at, min_participants)
      select host.id, ${sqlText(title)}, ${sqlText(description)},
        (select id from public.categories where slug = 'learning'), false,
        (select id from place),
        now() + interval '${startsInHours} hours',
        now() + interval '${deadlineInHours} hours',
        ${Math.trunc(fee)}, ${capacity}, ${staffCount}, '${joinType}', ${approvalCriteria ? sqlText(approvalCriteria) : "null"}, '${status}',
        ${sqlOrNull(feeNote)}, ${sqlOrNull(minAge)}, ${sqlOrNull(maxAge)}, ${sqlOrNull(materialUrl)},
        now() + interval '${confirmInHours} hours', ${Math.trunc(minParticipants)}
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

/**
 * 등록 함수·화면 테스트가 만든 외부 장소를 지운다. 이름이 "[E2E]"로 시작하고 어느 소셜링도 쓰지 않는 장소만.
 * 소셜링을 먼저 지운 뒤 부른다.
 */
export async function deleteTestVenues() {
  await runQuery(`
    delete from public.venues v
    where v.type = 'external' and v.name like '[E2E]%'
      and not exists (select 1 from public.socialings s where s.venue_id = v.id);
  `);
}

/** 소셜링의 장소 (유형, 이름, 시·군·구 코드) */
export async function venueOf(socialingId: number) {
  const rows = await runQuery<{ venue_id: number; type: string; name: string; region_code: string }>(`
    select v.id as venue_id, v.type, v.name, r.code as region_code
    from public.socialings s
    join public.venues v on v.id = s.venue_id
    join public.regions r on r.id = v.region_id
    where s.id = ${socialingId};
  `);
  return rows[0];
}

/** 스터디지점 이름 → venue id (시드: 강남점·홍대점·성수점) */
export async function branchIdOf(name: string): Promise<number> {
  const rows = await runQuery<{ id: number }>(
    `select id from public.venues where type = 'branch' and name = ${sqlText(name)};`,
  );
  if (!rows[0]) throw new Error(`스터디지점 ${name}이 없습니다(npm run seed).`);
  return rows[0].id;
}

/** 테스트 소셜링에 신청 행을 바로 넣고 id를 돌려준다. 함수로는 만들 수 없는 상태(거절, 일시 지난 신청 등)를 준비할 때 쓴다 */
export async function addApplication(
  socialingId: number,
  user: DemoUserKey,
  status: "pending" | "accepted" | "rejected" | "canceled",
  /** 거절이면 거절 사유와 덧붙인 말 (MS14 U10). 없으면 MS14 전처럼 사유 없는 거절 */
  reject?: { reason: "criteria" | "age" | "full" | "host" | "other"; note?: string },
): Promise<number> {
  const rows = await runQuery<{ id: number }>(`
    insert into public.applications (socialing_id, user_id, status, decided_at, canceled_at, reject_reason, reject_note)
    select ${socialingId}, id, '${status}',
      case when '${status}' in ('accepted', 'rejected') then now() end,
      case when '${status}' = 'canceled' then now() end,
      ${reject ? sqlText(reject.reason) : "null"},
      ${reject?.note ? sqlText(reject.note) : "null"}
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
    /** 확정 기한 (MS15). 신청 마감을 옮기면 주지 않아도 신청 마감과 같은 값으로 함께 옮긴다(만들 때 기본값과 같음) */
    confirmInHours?: number;
    /** 호스트를 바꾼다. 보는 사람이 그 소셜링의 호스트가 된 경우(IS_HOST)를 만든다 */
    host?: DemoUserKey;
  },
) {
  const deadline = change.deadlineInHours ?? (change.startsInHours !== undefined ? change.startsInHours - 1 : undefined);
  const confirm = change.confirmInHours ?? deadline;
  const sets = [
    change.status ? `status = '${change.status}'` : null,
    deadline !== undefined ? `apply_deadline_at = now() + interval '${deadline} hours'` : null,
    confirm !== undefined ? `confirm_deadline_at = now() + interval '${confirm} hours'` : null,
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

/**
 * 테스트 소셜링에 user의 인증 후기를 바로 넣는다 (소셜링을 지우면 함께 지워진다).
 * checks를 주면 비공개 확인 응답(① 구성 같음 ② 돈 요구 ③ 내용 같음)도 함께 넣는다.
 */
export async function addReview(
  socialingId: number,
  user: DemoUserKey,
  {
    body = "자동 테스트가 넣은 인증 후기입니다.",
    photoPath,
    checks,
  }: { body?: string; photoPath?: string; checks?: [boolean, boolean, boolean] } = {},
) {
  await runQuery(`
    with inserted as (
      insert into public.reviews (socialing_id, user_id, body, photo_path)
      select ${socialingId}, id, ${sqlText(body)}, ${photoPath ? sqlText(photoPath) : "null"}
      from auth.users where email = ${sqlText(DEMO_USERS[user].email)}
      returning id
    )
    ${
      checks
        ? `insert into public.review_checks (review_id, members_match, extra_money, content_match)
           select id, ${checks[0]}, ${checks[1]}, ${checks[2]} from inserted;`
        : "select id from inserted;"
    }
  `);
}

/** 소셜링의 인증 후기와 비공개 응답 (DB에서 바로 읽는다. 앱에서는 비공개 응답을 누구도 읽을 수 없다) */
export async function reviewsOf(socialingId: number) {
  return runQuery<{
    body: string;
    photo_path: string | null;
    members_match: boolean;
    extra_money: boolean;
    content_match: boolean;
  }>(`
    select r.body, r.photo_path, c.members_match, c.extra_money, c.content_match
    from public.reviews r left join public.review_checks c on c.review_id = r.id
    where r.socialing_id = ${socialingId}
    order by r.id;
  `);
}

/** 테스트 소셜링의 제목 ("[E2E] 테스트 소셜링 …") */
export async function titleOf(socialingId: number): Promise<string> {
  const rows = await runQuery<{ title: string }>(`select title from public.socialings where id = ${socialingId};`);
  return rows[0].title;
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
    const code = /\b(FULL|ALREADY_APPLIED|ALREADY_PROCESSED|ALREADY_REPORTED|DEADLINE_PASSED|HOST_CANCELED|IS_HOST|NOT_OPEN)\b/.exec(message);
    return code ? code[1] : message;
  }
}

/** 가입 테스트가 만든 계정을 지운다. 데모 도메인 계정만 지운다 (profiles는 on delete cascade) */
export async function deleteAuthUsers(emails: string[]) {
  const targets = emails.filter((email) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`));
  if (targets.length === 0) return;
  await runQuery(`delete from auth.users where email in (${targets.map(sqlText).join(", ")});`);
}
