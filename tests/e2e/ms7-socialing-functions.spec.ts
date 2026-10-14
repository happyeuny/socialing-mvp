import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  addApplication,
  apiHeaders,
  branchIdOf,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  deleteTestVenues,
  rpc,
  supabaseUrl,
  venueOf,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS7 create_socialing · update_socialing: 소셜링 등록·수정 함수 (architecture 5장, spec M8·6장·8.6 P07·P08)
// 시드 호스트 목록이 바뀌지 않게 테스트 전용 호스트 계정을 가입시켜 쓴다.
// 끝에 소셜링(신청 포함) → 테스트가 만든 외부 장소 → 계정 순서로 지운다.
// 사진 경로 확인용으로 올린 작은 파일은 버킷에 남고 다음 `npm run seed`가 비운다.

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

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const tag = () => Math.random().toString(36).slice(2, 8);

type SocialingRow = {
  id: number;
  host_id: string;
  title: string;
  description: string;
  status: string;
  venue_id: number;
  starts_at: string;
  apply_deadline_at: string;
  fee: number;
  capacity: number;
  staff_count: number;
  join_type: string;
  approval_criteria: string | null;
  cover_photo_path: string | null;
};

let defaults: Promise<{ categoryId: number; gangnamId: number }> | undefined;
/** 취미 카테고리와 강남점 id (한 번만 읽는다) */
function readDefaults() {
  defaults ??= (async () => {
    const [{ id: categoryId }] = await runQuery<{ id: number }>(
      `select id from public.categories where slug = 'hobby';`,
    );
    return { categoryId, gangnamId: await branchIdOf("강남점") };
  })();
  return defaults;
}

/** 등록·수정 입력. 기본은 강남점, 3일 뒤, 선착순 */
async function input(change: Record<string, unknown> = {}) {
  const { categoryId, gangnamId } = await readDefaults();
  return {
    p_title: `[E2E] 등록 함수 ${tag()}`,
    p_description: "자동 테스트가 만들고 지우는 소셜링이에요. 함께 이야기 나눠요.",
    p_category_id: categoryId,
    p_has_alcohol: false,
    p_branch_id: gangnamId,
    p_region_code: null,
    p_place_name: null,
    p_starts_at: inDays(3),
    p_apply_deadline_at: inDays(2),
    p_fee: 15000,
    p_capacity: 6,
    p_staff_count: 1,
    p_join_type: "first_come",
    p_approval_criteria: null,
    p_cover_photo_path: null,
    ...change,
  };
}

async function create(request: APIRequestContext, host: TestUser, change: Record<string, unknown> = {}) {
  const result = await rpc(request, "create_socialing", await input(change), host.accessToken);
  const row = result.body as unknown as SocialingRow;
  if (result.status === 200) createdSocialings.push(row.id);
  return { status: result.status, code: result.body.message, row };
}

/** 지금 행을 그대로 다시 보내는 수정 입력 (장소는 지점) */
async function sameAs(id: number, change: Record<string, unknown> = {}) {
  const [row] = await runQuery<SocialingRow & { category_id: number; has_alcohol: boolean }>(
    `select * from public.socialings where id = ${id};`,
  );
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
    ...change,
  };
}

async function update(request: APIRequestContext, host: TestUser, args: Record<string, unknown>) {
  const result = await rpc(request, "update_socialing", args, host.accessToken);
  return { status: result.status, code: result.body.message, row: result.body as unknown as SocialingRow };
}

/** 로그인한 사람으로 socialing-photos에 작은 파일을 올리고 경로를 돌려준다 */
async function uploadPhoto(request: APIRequestContext, user: TestUser, folder = user.id) {
  const path = `${folder}/${randomUUID()}.jpg`;
  const response = await request.post(`${supabaseUrl}/storage/v1/object/socialing-photos/${path}`, {
    headers: { ...apiHeaders(user.accessToken), "Content-Type": "image/jpeg" },
    data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  expect(response.status(), "사진 올리기").toBe(200);
  return path;
}

test.describe("MS7 create_socialing", () => {
  test("10단계: 스터디지점 소셜링을 열면 모집중 행을 돌려주고, 호스트는 부른 사람, 글 앞뒤 공백은 뺀다", async ({
    request,
  }) => {
    const host = await newHost(request, "create-branch");
    const title = `[E2E] 지점 소셜링 ${tag()}`;
    const result = await create(request, host, {
      p_title: `  ${title}\n`,
      p_description: "\n  자동 테스트가 만든 소셜링이에요. 함께 이야기 나눠요.  ",
      // 선착순이면 승인 기준은 버린다
      p_approval_criteria: "책을 미리 읽어 오면 좋아요",
    });
    expect(result.status).toBe(200);
    expect(result.row).toMatchObject({
      host_id: host.id,
      title,
      description: "자동 테스트가 만든 소셜링이에요. 함께 이야기 나눠요.",
      status: "recruiting",
      fee: 15000,
      capacity: 6,
      staff_count: 1,
      join_type: "first_come",
      approval_criteria: null,
      cover_photo_path: null,
    });
    expect(await venueOf(result.row.id)).toMatchObject({ type: "branch", name: "강남점" });
  });

  test("지역 + 장소 이름이면 그 시·군·구에 외부 장소를 새로 만든다. 호스트 승인이면 승인 기준을 남긴다", async ({
    request,
  }) => {
    const host = await newHost(request, "create-external");
    const placeName = `[E2E] 망원 책방 ${tag()}`;
    const result = await create(request, host, {
      p_branch_id: null,
      p_region_code: "11440",
      p_place_name: ` ${placeName} `,
      p_join_type: "approval",
      p_approval_criteria: "  책을 미리 읽어 오면 좋아요 ",
    });
    expect(result.status).toBe(200);
    expect(result.row.approval_criteria).toBe("책을 미리 읽어 오면 좋아요");
    expect(await venueOf(result.row.id)).toMatchObject({ type: "external", name: placeName, region_code: "11440" });

    // 승인 기준이 비어 있으면 null
    const empty = await create(request, host, { p_join_type: "approval", p_approval_criteria: "   " });
    expect(empty.status).toBe(200);
    expect(empty.row.approval_criteria).toBeNull();
  });

  test("P07-04~09: 입력 범위 밖이면 INVALID_INPUT이고 아무것도 만들지 않는다", async ({ request }) => {
    const host = await newHost(request, "create-invalid");
    const [{ id: externalVenueId }] = await runQuery<{ id: number }>(
      `select id from public.venues where type = 'external' order by id limit 1;`,
    );
    const cases: [string, Record<string, unknown>][] = [
      ["제목 없음", { p_title: "   " }],
      ["제목 41자", { p_title: `[E2E] ${"가".repeat(35)}` }],
      ["소개 19자", { p_description: "가".repeat(19) }],
      ["소개 1001자", { p_description: "가".repeat(1001) }],
      ["없는 카테고리", { p_category_id: 999999 }],
      ["술 여부 없음", { p_has_alcohol: null }],
      ["소셜링 일시가 지금 이전", { p_starts_at: inDays(-1), p_apply_deadline_at: inDays(-2) }],
      ["신청 마감 > 소셜링 일시", { p_apply_deadline_at: inDays(4) }],
      ["총 참가비 음수", { p_fee: -1 }],
      ["총 참가비 100만 원 초과", { p_fee: 1_000_001 }],
      ["정원 1명", { p_capacity: 1 }],
      ["정원 21명", { p_capacity: 21 }],
      ["스태프 음수", { p_staff_count: -1 }],
      ["스태프 21명", { p_staff_count: 21 }],
      ["승인 기준 201자", { p_join_type: "approval", p_approval_criteria: "가".repeat(201) }],
      ["지점과 지역을 함께", { p_region_code: "11440", p_place_name: "[E2E] 장소" }],
      ["장소 없음", { p_branch_id: null }],
      ["외부 장소 id를 지점으로", { p_branch_id: externalVenueId }],
      ["없는 시·군·구", { p_branch_id: null, p_region_code: "99999", p_place_name: "[E2E] 장소" }],
      ["시·도 코드만", { p_branch_id: null, p_region_code: "11", p_place_name: "[E2E] 장소" }],
      ["장소 이름 없음", { p_branch_id: null, p_region_code: "11440", p_place_name: "  " }],
      ["장소 이름 41자", { p_branch_id: null, p_region_code: "11440", p_place_name: `[E2E] ${"가".repeat(35)}` }],
    ];
    for (const [name, change] of cases) {
      const result = await create(request, host, change);
      expect(result.code, name).toBe("INVALID_INPUT");
    }

    const [{ count }] = await runQuery<{ count: number }>(
      `select count(*)::int as count from public.socialings where host_id = '${host.id}';`,
    );
    expect(count).toBe(0);
  });

  test("경계 값은 받는다: 제목 40자, 소개 20자·1000자, 정원 2·20명, 스태프 0명, 무료, 신청 마감 = 소셜링 일시", async ({
    request,
  }) => {
    const host = await newHost(request, "create-edge");
    const startsAt = inDays(5);
    const results = await Promise.all([
      create(request, host, { p_title: `[E2E] ${"가".repeat(34)}`, p_description: "가".repeat(20), p_capacity: 2 }),
      create(request, host, {
        p_description: "가".repeat(1000),
        p_capacity: 20,
        p_staff_count: 0,
        p_fee: 0,
        p_starts_at: startsAt,
        p_apply_deadline_at: startsAt,
      }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
  });

  test("대표 사진: 내 폴더에 올린 파일은 받고, 남의 폴더 파일·없는 파일은 INVALID_INPUT", async ({ request }) => {
    const host = await newHost(request, "create-photo");
    const other = await newHost(request, "create-photo-other");
    const own = await uploadPhoto(request, host);
    const others = await uploadPhoto(request, other);

    const ok = await create(request, host, { p_cover_photo_path: own });
    expect(ok.status).toBe(200);
    expect(ok.row.cover_photo_path).toBe(own);

    expect((await create(request, host, { p_cover_photo_path: others })).code).toBe("INVALID_INPUT");
    expect((await create(request, host, { p_cover_photo_path: `${host.id}/${randomUUID()}.jpg` })).code).toBe(
      "INVALID_INPUT",
    );
  });

  test("E02: 비로그인은 부를 수 없다", async ({ request }) => {
    const result = await rpc(request, "create_socialing", await input());
    expect(result.status).not.toBe(200);
  });
});

test.describe("MS7 update_socialing", () => {
  test("P08-05: 호스트가 고치면 바뀐 행을 돌려준다 (제목·카테고리·술·정원·스태프·모집 방식·승인 기준)", async ({
    request,
  }) => {
    const host = await newHost(request, "update-basic");
    const id = await fixture(host, { capacity: 4 });
    const [{ id: partyId }] = await runQuery<{ id: number }>(`select id from public.categories where slug = 'party';`);
    const title = `[E2E] 고친 제목 ${tag()}`;

    const result = await update(
      request,
      host,
      await sameAs(id, {
        p_title: title,
        p_category_id: partyId,
        p_has_alcohol: true,
        p_capacity: 10,
        p_staff_count: 2,
        p_fee: 20000,
        p_join_type: "approval",
        p_approval_criteria: "처음 오시는 분 환영해요",
      }),
    );
    expect(result.status).toBe(200);
    expect(result.row).toMatchObject({
      id,
      title,
      capacity: 10,
      staff_count: 2,
      fee: 20000,
      join_type: "approval",
      approval_criteria: "처음 오시는 분 환영해요",
      status: "recruiting",
    });

    // 선착순으로 되돌리면 승인 기준은 지운다
    const back = await update(request, host, await sameAs(id, { p_join_type: "first_come" }));
    expect(back.row.approval_criteria).toBeNull();
  });

  test("E05·E06: 호스트가 아니면 NOT_HOST, 없는 소셜링은 INVALID_INPUT, 종료·호스트 취소면 INVALID_STATE", async ({
    request,
  }) => {
    const host = await newHost(request, "update-guard");
    const other = await newHost(request, "update-guard-other");
    const [open, completed, canceled] = await Promise.all([
      fixture(host),
      fixture(host, { status: "completed", deadlineInHours: -26, startsInHours: -25 }),
      fixture(host, { status: "canceled" }),
    ]);

    expect((await update(request, other, await sameAs(open))).code).toBe("NOT_HOST");
    expect((await update(request, host, { ...(await sameAs(open)), p_socialing_id: 999999999 })).code).toBe(
      "INVALID_INPUT",
    );
    expect((await update(request, host, await sameAs(completed))).code).toBe("INVALID_STATE");
    expect((await update(request, host, await sameAs(canceled))).code).toBe("INVALID_STATE");
    // 확정은 고칠 수 있다
    const confirmed = await fixture(host, { status: "confirmed" });
    expect((await update(request, host, await sameAs(confirmed))).status).toBe(200);
    // 비로그인은 부를 수 없다
    expect((await rpc(request, "update_socialing", await sameAs(open))).status).not.toBe(200);
  });

  test("수정 잠금(P08-02): 참여 확정자가 있으면 일시·장소·참가비를 바꾸면 LOCKED_FIELD, 그대로 두면 다른 칸은 저장된다", async ({
    request,
  }) => {
    const host = await newHost(request, "update-lock");
    const id = await fixture(host, { capacity: 6, accepted: ["P1", "P2"] });
    const before = await sameAs(id);
    const hongdae = await branchIdOf("홍대점");

    const cases: [string, Record<string, unknown>][] = [
      ["소셜링 일시", { p_starts_at: inDays(10), p_apply_deadline_at: inDays(9) }],
      ["장소: 다른 지점", { p_branch_id: hongdae }],
      ["장소: 외부 장소로", { p_branch_id: null, p_region_code: "11440", p_place_name: "[E2E] 다른 장소" }],
      ["총 참가비", { p_fee: (before.p_fee as number) + 1000 }],
    ];
    for (const [name, change] of cases) {
      expect((await update(request, host, { ...before, ...change })).code, name).toBe("LOCKED_FIELD");
    }

    // 잠긴 칸을 그대로 두면 제목·신청 마감·정원은 바뀐다
    const title = `[E2E] 잠금 중 고친 제목 ${tag()}`;
    const deadline = new Date(Date.parse(before.p_starts_at as string) - 3 * 60 * 60 * 1000).toISOString();
    const ok = await update(request, host, { ...before, p_title: title, p_apply_deadline_at: deadline, p_capacity: 8 });
    expect(ok.status).toBe(200);
    expect(ok.row).toMatchObject({ title, capacity: 8 });
    expect(Date.parse(ok.row.apply_deadline_at)).toBe(Date.parse(deadline));
  });

  test("P08-03: 정원은 참여 확정 인원보다 적게 할 수 없다 (BELOW_ACCEPTED), 같으면 된다", async ({ request }) => {
    const host = await newHost(request, "update-capacity");
    const id = await fixture(host, { capacity: 6, accepted: ["P1", "P2", "P3"] });
    expect((await update(request, host, await sameAs(id, { p_capacity: 2 }))).code).toBe("BELOW_ACCEPTED");
    const ok = await update(request, host, await sameAs(id, { p_capacity: 3 }));
    expect(ok.status).toBe(200);
    expect(ok.row.capacity).toBe(3);
  });

  test("승인 대기 신청이 있으면 모집 방식을 바꾸면 LOCKED_FIELD, 승인 대기가 없으면 바뀐다", async ({ request }) => {
    const host = await newHost(request, "update-join-type");
    const [withPending, decided] = await Promise.all([
      fixture(host, { joinType: "approval", capacity: 4 }),
      fixture(host, { joinType: "approval", capacity: 4 }),
    ]);
    await Promise.all([addApplication(withPending, "P1", "pending"), addApplication(decided, "P1", "rejected")]);

    expect((await update(request, host, await sameAs(withPending, { p_join_type: "first_come" }))).code).toBe(
      "LOCKED_FIELD",
    );
    // 모집 방식을 그대로 두면 다른 칸은 고칠 수 있다
    expect((await update(request, host, await sameAs(withPending, { p_capacity: 5 }))).status).toBe(200);

    const ok = await update(request, host, await sameAs(decided, { p_join_type: "first_come" }));
    expect(ok.status).toBe(200);
    expect(ok.row.join_type).toBe("first_come");
  });

  test("소셜링 일시: 같은 분이면 바꾸지 않은 것(지난 일시도 그대로 저장), 지난 일시로 바꾸면 INVALID_INPUT", async ({
    request,
  }) => {
    const host = await newHost(request, "update-time");
    // 확정한 채 일시가 지남 (초 단위까지 있는 시각)
    const past = await fixture(host, { status: "confirmed", deadlineInHours: -3, startsInHours: -2, accepted: ["P1"] });
    const before = await sameAs(past);
    // 화면은 분 단위로 보낸다
    const toMinute = (iso: string) => {
      const date = new Date(iso);
      date.setUTCSeconds(0, 0);
      return date.toISOString();
    };
    const ok = await update(request, host, {
      ...before,
      p_starts_at: toMinute(before.p_starts_at as string),
      p_apply_deadline_at: toMinute(before.p_apply_deadline_at as string),
      p_title: `[E2E] 지난 소셜링 제목 ${tag()}`,
    });
    expect(ok.status).toBe(200);
    expect(Date.parse(ok.row.starts_at)).toBe(Date.parse(before.p_starts_at as string));

    const open = await fixture(host);
    const result = await update(
      request,
      host,
      await sameAs(open, { p_starts_at: inDays(-1), p_apply_deadline_at: inDays(-2) }),
    );
    expect(result.code).toBe("INVALID_INPUT");
  });

  test("장소: 같은 외부 장소면 장소 행을 그대로 쓰고, 이름이 바뀌면 새 장소를 만든다", async ({ request }) => {
    const host = await newHost(request, "update-place");
    const name = `[E2E] 성수 공방 ${tag()}`;
    const created = await create(request, host, { p_branch_id: null, p_region_code: "11200", p_place_name: name });
    const first = await venueOf(created.row.id);
    const external = { p_branch_id: null, p_region_code: "11200", p_place_name: ` ${name} ` };

    await update(request, host, await sameAs(created.row.id, external));
    expect((await venueOf(created.row.id)).venue_id).toBe(first.venue_id);

    await update(request, host, await sameAs(created.row.id, { ...external, p_place_name: `${name} 2층` }));
    const renamed = await venueOf(created.row.id);
    expect(renamed.venue_id).not.toBe(first.venue_id);
    expect(renamed).toMatchObject({ type: "external", name: `${name} 2층`, region_code: "11200" });
  });

  test("P08-04: 대표 사진은 그대로·새 사진·지움이 되고, 남의 폴더 사진은 INVALID_INPUT", async ({ request }) => {
    const host = await newHost(request, "update-photo");
    const other = await newHost(request, "update-photo-other");
    const [first, second, others] = await Promise.all([
      uploadPhoto(request, host),
      uploadPhoto(request, host),
      uploadPhoto(request, other),
    ]);
    const created = await create(request, host, { p_cover_photo_path: first });
    const id = created.row.id;

    expect((await update(request, host, await sameAs(id))).row.cover_photo_path).toBe(first);
    expect((await update(request, host, await sameAs(id, { p_cover_photo_path: second }))).row.cover_photo_path).toBe(
      second,
    );
    expect((await update(request, host, await sameAs(id, { p_cover_photo_path: others }))).code).toBe("INVALID_INPUT");
    expect((await update(request, host, await sameAs(id, { p_cover_photo_path: null }))).row.cover_photo_path).toBeNull();
  });
});
