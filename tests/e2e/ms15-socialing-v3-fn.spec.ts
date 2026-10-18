import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  branchIdOf,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  deleteTestVenues,
  readAs,
  rpc,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS15 create_socialing_v3 · update_socialing_v3: 최소 인원·확정 기한을 받는 등록·수정 함수 (04 2.2·2.3·8.1, architecture 5장)
// 최소 인원 2명~정원, 신청 마감 ≤ 확정 기한 ≤ 소셜링 일시 − 12시간(수정은 세 일시 중 하나를 바꿀 때만),
// 참여 확정자가 있으면 최소 인원·확정 기한 잠금(LOCKED_FIELD), 계산으로 취소면 수정 막음(AUTO_CANCELED).
// MS7·MS14 검사가 그대로 걸리는지는 ms7-socialing-functions(_v3로 부름)와 ms14-socialing-v2-fn.
// 옛 create_socialing·update_socialing은 지웠고, _v2는 MS16까지 남아 확정 기한·최소 인원 기본값으로 동작한다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteTestVenues();
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

async function newHost(request: APIRequestContext, label: string) {
  const host = await createTestUser(request, label);
  createdUsers.push(host);
  return host;
}

async function fixture(host: TestUser, options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host, ...options });
  createdSocialings.push(id);
  return id;
}

const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();
const tag = () => Math.random().toString(36).slice(2, 8);

type SocialingRow = {
  id: number;
  title: string;
  status: string;
  capacity: number;
  min_participants: number;
  starts_at: string;
  apply_deadline_at: string;
  confirm_deadline_at: string;
};

let defaults: Promise<{ categoryId: number; gangnamId: number }> | undefined;
function readDefaults() {
  defaults ??= (async () => {
    const [{ id: categoryId }] = await runQuery<{ id: number }>(
      `select id from public.categories where slug = 'hobby';`,
    );
    return { categoryId, gangnamId: await branchIdOf("강남점") };
  })();
  return defaults;
}

/** 등록 입력. 기본은 무료, 3일 뒤(72시간), 신청 마감 48시간 뒤, 확정 기한 54시간 뒤, 최소 3명·정원 6명 */
async function input(change: Record<string, unknown> = {}) {
  const { categoryId, gangnamId } = await readDefaults();
  return {
    p_title: `[E2E] 등록 v3 ${tag()}`,
    p_description: "자동 테스트가 만들고 지우는 소셜링이에요. 함께 이야기 나눠요.",
    p_category_id: categoryId,
    p_has_alcohol: false,
    p_branch_id: gangnamId,
    p_region_code: null,
    p_place_name: null,
    p_starts_at: inHours(72),
    p_apply_deadline_at: inHours(48),
    p_fee: 0,
    p_capacity: 6,
    p_staff_count: 0,
    p_join_type: "first_come",
    p_approval_criteria: null,
    p_cover_photo_path: null,
    p_fee_note: null,
    p_min_age: null,
    p_max_age: null,
    p_material_url: null,
    p_min_participants: 3,
    p_confirm_deadline_at: inHours(54),
    ...change,
  };
}

async function create(request: APIRequestContext, host: TestUser, change: Record<string, unknown> = {}, fn = "create_socialing_v3") {
  const result = await rpc(request, fn, await input(change), host.accessToken);
  const row = result.body as unknown as SocialingRow;
  if (result.status === 200) createdSocialings.push(row.id);
  return { status: result.status, code: result.body.message, row };
}

/** 지금 행을 그대로 다시 보내는 수정 입력 (장소는 지점) */
async function sameAs(id: number, change: Record<string, unknown> = {}) {
  const [row] = await runQuery<Record<string, unknown>>(`select * from public.socialings where id = ${id};`);
  return {
    p_socialing_id: id,
    p_title: row.title,
    p_description: "자동 테스트가 고치는 소셜링이에요. 소개는 스무 자 이상이어야 해요.",
    p_category_id: row.category_id,
    p_has_alcohol: row.has_alcohol,
    p_branch_id: row.venue_id,
    p_region_code: null,
    p_place_name: null,
    p_starts_at: row.starts_at,
    p_apply_deadline_at: row.apply_deadline_at,
    p_fee: row.fee,
    p_capacity: row.capacity,
    p_staff_count: row.staff_count,
    p_join_type: row.join_type,
    p_approval_criteria: row.approval_criteria,
    p_cover_photo_path: row.cover_photo_path,
    p_fee_note: row.fee_note,
    p_min_age: row.min_age,
    p_max_age: row.max_age,
    p_material_url: row.material_url,
    p_min_participants: row.min_participants,
    p_confirm_deadline_at: row.confirm_deadline_at,
    ...change,
  };
}

async function update(request: APIRequestContext, host: TestUser, args: Record<string, unknown>, fn = "update_socialing_v3") {
  const result = await rpc(request, fn, args, host.accessToken);
  return { status: result.status, code: result.body.message, row: result.body as unknown as SocialingRow };
}

const same = (a: string, b: string) => Date.parse(a) === Date.parse(b);

test.describe("MS15 create_socialing_v3", () => {
  test("최소 인원·확정 기한을 저장하고, 목록·상세 뷰 끝 칸으로 누구나 읽는다", async ({ request }) => {
    const host = await newHost(request, "v3-create");
    const confirm = inHours(54);
    const result = await create(request, host, { p_confirm_deadline_at: confirm, p_min_participants: 4 });
    expect(result.status).toBe(200);
    expect(result.row).toMatchObject({ status: "recruiting", min_participants: 4, capacity: 6 });
    expect(same(result.row.confirm_deadline_at, confirm)).toBe(true);

    const { rows } = await readAs<{ min_participants: number; display_status: string; needed_count: number }>(
      request,
      `socialing_summaries?select=min_participants,display_status,needed_count&id=eq.${result.row.id}`,
    );
    expect(rows).toEqual([{ min_participants: 4, display_status: "recruiting", needed_count: 4 }]);
  });

  test("2.2 최소 인원: 2명부터 정원까지, 비우면 INVALID_INPUT", async ({ request }) => {
    const host = await newHost(request, "v3-min");
    for (const [name, value] of [
      ["1명", 1],
      ["정원 + 1", 7],
      ["비움", null],
    ] as const) {
      expect((await create(request, host, { p_min_participants: value })).code, name).toBe("INVALID_INPUT");
    }
    const [two, capacity] = await Promise.all([
      create(request, host, { p_min_participants: 2 }),
      create(request, host, { p_min_participants: 6 }),
    ]);
    expect([two.row.min_participants, capacity.row.min_participants]).toEqual([2, 6]);
  });

  test("2.3 확정 기한(결정 H1·H2): 신청 마감 ≤ 확정 기한 ≤ 소셜링 일시 − 12시간, 비우면 INVALID_INPUT. 경계는 받는다", async ({
    request,
  }) => {
    const host = await newHost(request, "v3-confirm");
    const startsAt = inHours(72);
    const twelveBefore = new Date(Date.parse(startsAt) - 12 * HOUR).toISOString();
    const elevenBefore = new Date(Date.parse(startsAt) - 11 * HOUR).toISOString();
    for (const [name, change] of [
      ["확정 기한 비움", { p_confirm_deadline_at: null }],
      ["확정 기한 < 신청 마감", { p_confirm_deadline_at: inHours(47) }],
      ["확정 기한이 일시 11시간 전", { p_starts_at: startsAt, p_confirm_deadline_at: elevenBefore }],
      ["신청 마감도 12시간 안 (확정 기한 = 신청 마감)", { p_starts_at: startsAt, p_apply_deadline_at: elevenBefore, p_confirm_deadline_at: elevenBefore }],
    ] as const) {
      expect((await create(request, host, change)).code, name).toBe("INVALID_INPUT");
    }
    const [equal, last] = await Promise.all([
      // 같은 값도 된다(확정 대기 없이 마감 때 바로 정해진다)
      create(request, host, { p_confirm_deadline_at: inHours(48), p_apply_deadline_at: inHours(48) }),
      create(request, host, { p_starts_at: startsAt, p_confirm_deadline_at: twelveBefore }),
    ]);
    expect([equal.status, last.status]).toEqual([200, 200]);
  });

  test("_v2는 MS16까지 그대로 동작한다: 확정 기한 = 신청 마감, 최소 인원 2명", async ({ request }) => {
    const host = await newHost(request, "v3-v2-create");
    const args = await input();
    const { p_min_participants: _min, p_confirm_deadline_at: _confirm, ...v2 } = args;
    void _min;
    void _confirm;
    const result = await rpc(request, "create_socialing_v2", v2, host.accessToken);
    expect(result.status).toBe(200);
    const row = result.body as unknown as SocialingRow;
    createdSocialings.push(row.id);
    expect(row.min_participants).toBe(2);
    expect(same(row.confirm_deadline_at, row.apply_deadline_at)).toBe(true);
  });

  test("옛 create_socialing·update_socialing은 지웠다 (MS15 첫 PR, 03 10.1 약속)", async ({ request }) => {
    const host = await newHost(request, "v3-old");
    const { p_min_participants: _a, p_confirm_deadline_at: _b, p_fee_note: _c, p_min_age: _d, p_max_age: _e, p_material_url: _f, ...old } =
      await input();
    void [_a, _b, _c, _d, _e, _f];
    expect((await rpc(request, "create_socialing", old, host.accessToken)).status).toBe(404);
    expect((await rpc(request, "update_socialing", { p_socialing_id: 1, ...old }, host.accessToken)).status).toBe(404);
  });
});

test.describe("MS15 update_socialing_v3", () => {
  test("참여 확정자가 없으면 최소 인원·확정 기한을 바꾼다. 정원보다 큰 최소 인원은 INVALID_INPUT", async ({ request }) => {
    const host = await newHost(request, "v3-update");
    const id = await fixture(host, { capacity: 6, deadlineInHours: 48, startsInHours: 72 });
    const confirm = inHours(56);
    const ok = await update(request, host, await sameAs(id, { p_min_participants: 5, p_confirm_deadline_at: confirm }));
    expect(ok.status).toBe(200);
    expect(ok.row.min_participants).toBe(5);
    expect(same(ok.row.confirm_deadline_at, confirm)).toBe(true);

    // 정원을 최소 인원보다 적게 (P08 "정원은 최소 인원(5명)보다 적게 할 수 없어요"의 DB 쪽)
    expect((await update(request, host, await sameAs(id, { p_capacity: 4 }))).code).toBe("INVALID_INPUT");
  });

  test("2.2·2.3 잠금: 참여 확정자가 있으면 최소 인원·확정 기한을 바꾸면 LOCKED_FIELD. 신청 마감은 확정 기한 안에서 옮긴다", async ({
    request,
  }) => {
    const host = await newHost(request, "v3-lock");
    const id = await fixture(host, { capacity: 6, deadlineInHours: 30, confirmInHours: 40, startsInHours: 72, accepted: ["P1"] });
    const before = await sameAs(id);
    expect((await update(request, host, { ...before, p_min_participants: 3 })).code).toBe("LOCKED_FIELD");
    expect((await update(request, host, { ...before, p_confirm_deadline_at: inHours(50) })).code).toBe("LOCKED_FIELD");
    // 신청 마감은 잠기지 않지만 확정 기한을 넘을 수 없다
    expect((await update(request, host, { ...before, p_apply_deadline_at: inHours(41) })).code).toBe("INVALID_INPUT");
    const ok = await update(request, host, { ...before, p_apply_deadline_at: inHours(20) });
    expect(ok.status).toBe(200);
  });

  test("12시간은 세 일시 중 하나를 바꿀 때만 본다 (이미 12시간 안인 소셜링도 다른 칸은 고친다)", async ({ request }) => {
    const host = await newHost(request, "v3-twelve");
    // 직접 넣어 확정 기한이 일시 2시간 전
    const id = await fixture(host, { deadlineInHours: 5, confirmInHours: 10, startsInHours: 12 });
    const title = `[E2E] 12시간 안 고친 제목 ${tag()}`;
    // 화면은 분 단위로 보낸다: 같은 분이면 바꾸지 않은 것
    const toMinute = (iso: unknown) => {
      const date = new Date(iso as string);
      date.setUTCSeconds(0, 0);
      return date.toISOString();
    };
    const before = await sameAs(id);
    const ok = await update(request, host, {
      ...before,
      p_title: title,
      p_starts_at: toMinute(before.p_starts_at),
      p_apply_deadline_at: toMinute(before.p_apply_deadline_at),
      p_confirm_deadline_at: toMinute(before.p_confirm_deadline_at),
    });
    expect(ok.status).toBe(200);
    expect(ok.row.title).toBe(title);
    expect((await update(request, host, await sameAs(id, { p_confirm_deadline_at: inHours(9) }))).code).toBe("INVALID_INPUT");
  });

  test("계산으로 취소·호스트 취소면 AUTO_CANCELED, 확정 대기는 고친다", async ({ request }) => {
    const host = await newHost(request, "v3-auto");
    const [expired, canceled, awaiting] = await Promise.all([
      fixture(host, { deadlineInHours: -3, confirmInHours: -1, accepted: ["P1", "P2"] }),
      fixture(host, { deadlineInHours: -1, confirmInHours: 6 }),
      fixture(host, { deadlineInHours: -1, confirmInHours: 6, accepted: ["P1", "P2"] }),
    ]);
    expect((await update(request, host, await sameAs(expired))).code).toBe("AUTO_CANCELED");
    expect((await update(request, host, await sameAs(canceled))).code).toBe("AUTO_CANCELED");
    expect((await update(request, host, await sameAs(awaiting, { p_title: `[E2E] 확정 대기 ${tag()}` }))).status).toBe(200);
  });

  test("_v2 수정: 확정 기한을 신청 마감 ~ 소셜링 일시 안으로 맞추고, 최소 인원은 정원보다 크지 않게", async ({ request }) => {
    const host = await newHost(request, "v3-v2-update");
    const id = await fixture(host, { capacity: 6, minParticipants: 5, deadlineInHours: 24, confirmInHours: 30, startsInHours: 72 });
    const { p_min_participants: _min, p_confirm_deadline_at: _confirm, ...v2 } = await sameAs(id);
    void _min;
    void _confirm;
    const later = inHours(40);
    const result = await update(request, host, { ...v2, p_apply_deadline_at: later, p_capacity: 4 }, "update_socialing_v2");
    expect(result.status).toBe(200);
    expect(result.row.min_participants).toBe(4);
    expect(same(result.row.confirm_deadline_at, later)).toBe(true);
  });
});
