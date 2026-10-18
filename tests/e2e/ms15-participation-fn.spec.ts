import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  apiHeaders,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  readAs,
  rpc,
  supabaseUrl,
  titleOf,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS15 SH2 get_my_participation_record: 나만 보는 참여 기록 (04 4.2·4.4, 결정 H5, architecture 3.2)
// 최근 6개월(소셜링 일시 기준): 참여 = 종료 + 참여 확정, 늦은 취소 = 참여 확정이었다가 신청 마감 뒤 신청 취소,
// 새 멤버 = 참여 3회 미만, 늦은 취소 목록(제목·취소 일시·기록에서 빠지는 날 = 소셜링 일시 + 6개월).
// 다른 테스트와 섞이지 않게 참여자 계정을 가입시켜 그 계정의 신청을 직접 넣는다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

async function newUser(request: APIRequestContext, label: string) {
  const user = await createTestUser(request, label);
  createdUsers.push(user);
  return user;
}

async function fixture(options: Omit<FixtureOptions, "host"> & { host?: FixtureOptions["host"] }) {
  const id = await createFixtureSocialing({ host: "C", capacity: 6, ...options });
  createdSocialings.push(id);
  return id;
}

/** 지난 종료 소셜링 (daysAgo일 전, 신청 마감은 그 하루 전) */
const completedDaysAgo = (daysAgo: number) =>
  ({ status: "completed", deadlineInHours: -(daysAgo + 1) * 24, startsInHours: -daysAgo * 24 }) as const;

/**
 * 가입시킨 계정의 신청을 바로 넣는다. decidedHours·canceledHours는 지금부터 시간(음수면 전), null이면 비움.
 * 선착순 참여 확정은 신청 때, 호스트 승인은 승인 때 decided_at이 찍힌다(4.4).
 */
async function addMine(
  socialingId: number,
  user: TestUser,
  status: "pending" | "accepted" | "rejected" | "canceled",
  at: { decidedHours?: number | null; canceledHours?: number | null } = {},
) {
  const time = (hours: number | null | undefined) => (hours == null ? "null" : `now() + interval '${hours} hours'`);
  await runQuery(`
    insert into public.applications (socialing_id, user_id, status, decided_at, canceled_at)
    values (${socialingId}, '${user.id}', '${status}', ${time(at.decidedHours)}, ${time(at.canceledHours)});
  `);
}

type Record_ = {
  participated_count: number;
  late_cancel_count: number;
  is_new_member: boolean;
  late_cancels: { socialing_id: number; title: string; canceled_at: string; expires_at: string }[];
};

async function recordOf(request: APIRequestContext, user: TestUser): Promise<Record_> {
  const result = await rpc(request, "get_my_participation_record", {}, user.accessToken);
  expect(result.status).toBe(200);
  const rows = result.body as unknown as Record_[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

test.describe("MS15 SH2 참여 기록", () => {
  test("참여·늦은 취소는 정해진 경우만 세고, 소셜링 일시가 6개월보다 오래되면 빠진다", async ({ request }) => {
    const user = await newUser(request, "record-count");
    const [participated, oldParticipated, late, beforeDeadline, pendingAfter, rejected, hostCanceled, confirmedNow] =
      await Promise.all([
        // 참여 1: 종료 + 참여 확정 (10일 전)
        fixture(completedDaysAgo(10)),
        // 안 셈: 7개월 전 참여
        fixture(completedDaysAgo(215)),
        // 늦은 취소: 참여 확정(신청 마감 전에) → 신청 마감 뒤 취소 (20일 전 소셜링, 당일 오전 취소)
        fixture(completedDaysAgo(20)),
        // 안 셈: 참여 확정이었다가 신청 마감 전에 취소
        fixture(completedDaysAgo(30)),
        // 안 셈: 승인 대기 중 신청 마감 뒤 취소 (참여 확정이 아니었음)
        fixture({ ...completedDaysAgo(40), joinType: "approval" }),
        // 안 셈: 호스트 거절
        fixture({ ...completedDaysAgo(50), joinType: "approval" }),
        // 안 셈: 호스트 취소된 소셜링의 참여 확정 (참여도 아님)
        fixture({ status: "canceled", deadlineInHours: -60 * 24 - 24, startsInHours: -60 * 24 }),
        // 안 셈: 아직 종료 전 (확정, 미래)
        fixture({ status: "confirmed" }),
      ]);
    await Promise.all([
      addMine(participated, user, "accepted", { decidedHours: -15 * 24 }),
      addMine(oldParticipated, user, "accepted", { decidedHours: -220 * 24 }),
      addMine(late, user, "canceled", { decidedHours: -25 * 24, canceledHours: -20 * 24 - 10 }),
      addMine(beforeDeadline, user, "canceled", { decidedHours: -35 * 24, canceledHours: -32 * 24 }),
      addMine(pendingAfter, user, "canceled", { decidedHours: null, canceledHours: -40 * 24 - 5 }),
      addMine(rejected, user, "rejected", { decidedHours: -52 * 24 }),
      addMine(hostCanceled, user, "accepted", { decidedHours: -65 * 24 }),
      addMine(confirmedNow, user, "accepted", { decidedHours: -1 }),
    ]);

    const record = await recordOf(request, user);
    expect(record).toMatchObject({ participated_count: 1, late_cancel_count: 1, is_new_member: true });
    expect(record.late_cancels).toHaveLength(1);
    const [entry] = record.late_cancels;
    expect(entry.socialing_id).toBe(late);
    expect(entry.title).toBe(await titleOf(late));
    // 기록에서 빠지는 날 = 소셜링 일시 + 6개월
    const [{ expires }] = await runQuery<{ expires: string }>(
      `select (starts_at + interval '6 months') as expires from public.socialings where id = ${late};`,
    );
    expect(Date.parse(entry.expires_at)).toBe(Date.parse(expires));
  });

  test("새 멤버는 참여 3회 미만, 늦은 취소 목록은 최근 취소 순", async ({ request }) => {
    const user = await newUser(request, "record-new");
    const ids = await Promise.all([1, 2, 3].map((n) => fixture(completedDaysAgo(n * 5))));
    const [lateOld, lateNew] = await Promise.all([fixture(completedDaysAgo(90)), fixture(completedDaysAgo(60))]);
    await Promise.all([
      ...ids.map((id, i) => addMine(id, user, "accepted", { decidedHours: -(i + 2) * 5 * 24 })),
      addMine(lateOld, user, "canceled", { decidedHours: -100 * 24, canceledHours: -90 * 24 - 5 }),
      addMine(lateNew, user, "canceled", { decidedHours: -70 * 24, canceledHours: -60 * 24 - 5 }),
    ]);
    const record = await recordOf(request, user);
    expect(record).toMatchObject({ participated_count: 3, late_cancel_count: 2, is_new_member: false });
    expect(record.late_cancels.map((c) => c.socialing_id)).toEqual([lateNew, lateOld]);
  });

  test("결정 H5: 확정 대기에서 참여 확정자가 신청 취소하면 늦은 취소, 신청 마감 전 취소는 아니다 (함수로 취소)", async ({
    request,
  }) => {
    const user = await newUser(request, "record-cancel");
    const [awaiting, open] = await Promise.all([
      fixture({ deadlineInHours: -1, confirmInHours: 6, accepted: ["P1", "P2", "P3"] }),
      fixture({}),
    ]);
    await Promise.all([addMine(awaiting, user, "accepted", { decidedHours: -48 }), addMine(open, user, "accepted", { decidedHours: -2 })]);
    const mine = (
      await readAs<{ id: number; application_id: number; cancel_would_be_late: boolean }>(
        request,
        `my_applied_socialings?select=id,application_id,cancel_would_be_late&id=in.(${awaiting},${open})`,
        user.accessToken,
      )
    ).rows;
    for (const row of mine) {
      expect(row.cancel_would_be_late).toBe(row.id === awaiting);
      const result = await rpc(request, "cancel_application", { p_application_id: row.application_id }, user.accessToken);
      expect(result.status).toBe(200);
    }
    const record = await recordOf(request, user);
    expect(record).toMatchObject({ participated_count: 0, late_cancel_count: 1 });
    expect(record.late_cancels.map((c) => c.socialing_id)).toEqual([awaiting]);
  });

  test("나만 본다: 다른 사람은 자기 기록(0)만, 비로그인은 부를 수 없다. 호스트도 참여자 기록을 읽을 길이 없다", async ({
    request,
  }) => {
    const [user, other] = await Promise.all([newUser(request, "record-mine"), newUser(request, "record-other")]);
    const late = await fixture(completedDaysAgo(10));
    await addMine(late, user, "canceled", { decidedHours: -15 * 24, canceledHours: -10 * 24 - 5 });

    expect((await recordOf(request, user)).late_cancel_count).toBe(1);
    expect(await recordOf(request, other)).toEqual({
      participated_count: 0,
      late_cancel_count: 0,
      is_new_member: true,
      late_cancels: [],
    });
    const anonymous = await request.post(`${supabaseUrl}/rest/v1/rpc/get_my_participation_record`, {
      headers: apiHeaders(),
      data: {},
    });
    expect(anonymous.status()).not.toBe(200);
    // 인자가 없어 남의 기록을 고를 수 없다
    const withArg = await rpc(request, "get_my_participation_record", { p_user_id: user.id }, other.accessToken);
    expect(withArg.status).not.toBe(200);
  });
});
