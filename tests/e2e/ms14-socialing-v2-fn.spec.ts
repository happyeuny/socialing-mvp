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

// MS14 create_socialing_v2 · update_socialing_v2: 2묶음 칸을 받는 등록·수정 함수 (architecture 5장, spec M8·6장·8.6 P07·P08)
// 참가비 설명(U3), 승인 기준 필수(U5), 연령 조건(SH1b), 자료 링크(SH3). 지금 등록·수정 검사(MS7)는 그대로라
// 여기서는 새 검사와, 옛 검사가 그대로 걸리는지 몇 가지만 본다(옛 함수는 `ms7-socialing-functions`).
// 시드 호스트 목록이 바뀌지 않게 테스트 전용 호스트 계정을 가입시켜 쓴다.

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
const FEE_NOTE = "장소 대여 10,000원 + 음료 5,000원. 현장에서 따로 내는 돈은 없어요";
const WIKI = "https://ko.wikipedia.org/wiki/%EC%88%98%ED%95%84";

type SocialingRow = {
  id: number;
  title: string;
  fee: number;
  join_type: string;
  approval_criteria: string | null;
  fee_note: string | null;
  min_age: number | null;
  max_age: number | null;
  material_url: string | null;
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

/** 등록 입력. 기본은 강남점, 3일 뒤, 선착순, 15,000원 + 참가비 설명 */
async function input(change: Record<string, unknown> = {}) {
  const { categoryId, gangnamId } = await readDefaults();
  return {
    p_title: `[E2E] 등록 v2 ${tag()}`,
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
    p_staff_count: 0,
    p_join_type: "first_come",
    p_approval_criteria: null,
    p_cover_photo_path: null,
    p_fee_note: FEE_NOTE,
    p_min_age: null,
    p_max_age: null,
    p_material_url: null,
    ...change,
  };
}

async function create(request: APIRequestContext, host: TestUser, change: Record<string, unknown> = {}) {
  const result = await rpc(request, "create_socialing_v2", await input(change), host.accessToken);
  const row = result.body as unknown as SocialingRow;
  if (result.status === 200) createdSocialings.push(row.id);
  return { status: result.status, code: result.body.message, row };
}

/** 지금 행을 그대로 다시 보내는 수정 입력 (장소는 지점) */
async function sameAs(id: number, change: Record<string, unknown> = {}) {
  const [row] = await runQuery<
    SocialingRow & {
      category_id: number;
      has_alcohol: boolean;
      venue_id: number;
      starts_at: string;
      apply_deadline_at: string;
      capacity: number;
      staff_count: number;
      cover_photo_path: string | null;
    }
  >(`select * from public.socialings where id = ${id};`);
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
    ...change,
  };
}

async function update(request: APIRequestContext, host: TestUser, args: Record<string, unknown>) {
  const result = await rpc(request, "update_socialing_v2", args, host.accessToken);
  return { status: result.status, code: result.body.message, row: result.body as unknown as SocialingRow };
}

test.describe("MS14 create_socialing_v2", () => {
  test("참가비 설명·승인 기준·연령 조건·자료 링크를 저장하고 앞뒤 공백을 뺀다", async ({ request }) => {
    const host = await newHost(request, "v2-create");
    const result = await create(request, host, {
      p_fee_note: `  ${FEE_NOTE}\n`,
      p_join_type: "approval",
      p_approval_criteria: " 사진을 30장 이상 찍어 볼 분 ",
      p_min_age: 20,
      p_max_age: 39,
      p_material_url: ` ${WIKI} `,
    });
    expect(result.status).toBe(200);
    expect(result.row).toMatchObject({
      fee: 15000,
      fee_note: FEE_NOTE,
      join_type: "approval",
      approval_criteria: "사진을 30장 이상 찍어 볼 분",
      min_age: 20,
      max_age: 39,
      material_url: WIKI,
    });

    // 목록·상세 뷰 끝 칸으로 비로그인도 읽는다
    const { rows } = await readAs<SocialingRow>(
      request,
      `socialing_summaries?select=fee_note,min_age,max_age,material_url&id=eq.${result.row.id}`,
    );
    expect(rows).toEqual([{ fee_note: FEE_NOTE, min_age: 20, max_age: 39, material_url: WIKI }]);
  });

  test("U3 P07: 유료인데 참가비 설명이 비거나 100자를 넘으면 INVALID_INPUT. 100자·무료(설명 있음·없음)는 받는다", async ({
    request,
  }) => {
    const host = await newHost(request, "v2-fee-note");
    for (const [name, change] of [
      ["유료 + 설명 없음", { p_fee_note: null }],
      ["유료 + 공백뿐", { p_fee_note: " \n " }],
      ["설명 101자", { p_fee_note: "가".repeat(101) }],
      ["무료 + 설명 101자", { p_fee: 0, p_fee_note: "가".repeat(101) }],
    ] as const) {
      expect((await create(request, host, change)).code, name).toBe("INVALID_INPUT");
    }

    const [hundred, freeEmpty, freeNote] = await Promise.all([
      create(request, host, { p_fee_note: "가".repeat(100) }),
      create(request, host, { p_fee: 0, p_fee_note: "  " }),
      create(request, host, { p_fee: 0, p_fee_note: "물은 각자 챙겨 와요" }),
    ]);
    expect(hundred.row.fee_note).toBe("가".repeat(100));
    expect(freeEmpty.status).toBe(200);
    expect(freeEmpty.row.fee_note).toBeNull();
    expect(freeNote.row.fee_note).toBe("물은 각자 챙겨 와요");
  });

  test("U5 P07: 호스트 승인인데 승인 기준이 비면 INVALID_INPUT. 선착순이면 승인 기준·연령 조건은 버린다", async ({
    request,
  }) => {
    const host = await newHost(request, "v2-criteria");
    expect((await create(request, host, { p_join_type: "approval", p_approval_criteria: null })).code).toBe(
      "INVALID_INPUT",
    );
    expect((await create(request, host, { p_join_type: "approval", p_approval_criteria: "   " })).code).toBe(
      "INVALID_INPUT",
    );

    const firstCome = await create(request, host, {
      p_approval_criteria: "책을 미리 읽어 오면 좋아요",
      p_min_age: 20,
      p_max_age: 200,
    });
    expect(firstCome.status).toBe(200);
    expect(firstCome.row).toMatchObject({ join_type: "first_come", approval_criteria: null, min_age: null, max_age: null });
  });

  test("SH1b P07: 나이는 1~99, 최소 ≤ 최대이고 하나만 써도 된다. 둘 다 없으면 제한 없음", async ({ request }) => {
    const host = await newHost(request, "v2-age");
    const approval = { p_join_type: "approval", p_approval_criteria: "누구나 환영해요" };
    for (const [name, change] of [
      ["최소 0세", { p_min_age: 0 }],
      ["최대 100세", { p_max_age: 100 }],
      ["최소 > 최대", { p_min_age: 40, p_max_age: 20 }],
    ] as const) {
      expect((await create(request, host, { ...approval, ...change })).code, name).toBe("INVALID_INPUT");
    }

    const [minOnly, maxOnly, same, none] = await Promise.all([
      create(request, host, { ...approval, p_min_age: 30 }),
      create(request, host, { ...approval, p_max_age: 39 }),
      create(request, host, { ...approval, p_min_age: 1, p_max_age: 1 }),
      create(request, host, approval),
    ]);
    expect(minOnly.row).toMatchObject({ min_age: 30, max_age: null });
    expect(maxOnly.row).toMatchObject({ min_age: null, max_age: 39 });
    expect(same.row).toMatchObject({ min_age: 1, max_age: 1 });
    expect(none.row).toMatchObject({ min_age: null, max_age: null });
  });

  test("SH3 P07: 자료 링크는 https://로 시작하는 올바른 주소 500자까지. 빈칸은 null", async ({ request }) => {
    const host = await newHost(request, "v2-material");
    for (const url of [
      "http://ko.wikipedia.org/wiki/x",
      "ko.wikipedia.org/wiki/x",
      "javascript:alert(1)",
      "https://localhost/x",
      "https://ko.wikipedia.org/wiki/a b",
      "https://user@ko.wikipedia.org/x",
      `https://ko.wikipedia.org/${"a".repeat(500)}`,
    ]) {
      expect((await create(request, host, { p_material_url: url })).code, url).toBe("INVALID_INPUT");
    }

    const [ok, blank] = await Promise.all([
      create(request, host, { p_material_url: "https://docs.example.com:8443/a?b=1#c" }),
      create(request, host, { p_material_url: "   " }),
    ]);
    expect(ok.row.material_url).toBe("https://docs.example.com:8443/a?b=1#c");
    expect(blank.status).toBe(200);
    expect(blank.row.material_url).toBeNull();
  });

  test("지금 등록 검사는 그대로: 제목 없음·지난 일시는 INVALID_INPUT, 비로그인은 부를 수 없다", async ({ request }) => {
    const host = await newHost(request, "v2-create-guard");
    expect((await create(request, host, { p_title: "  " })).code).toBe("INVALID_INPUT");
    expect((await create(request, host, { p_starts_at: inDays(-1), p_apply_deadline_at: inDays(-2) })).code).toBe(
      "INVALID_INPUT",
    );
    expect((await rpc(request, "create_socialing_v2", await input())).status).not.toBe(200);
  });
});

test.describe("MS14 update_socialing_v2", () => {
  test("P08: 새 칸을 고치고, 선착순으로 바꾸면 승인 기준·연령 조건을 지운다", async ({ request }) => {
    const host = await newHost(request, "v2-update");
    const id = await fixture(host, { fee: 10000, feeNote: "음료 10,000원" });

    const approval = await update(
      request,
      host,
      await sameAs(id, {
        p_fee_note: "음료 5,000원 + 자료 5,000원",
        p_join_type: "approval",
        p_approval_criteria: "필름 카메라가 있는 분",
        p_min_age: 25,
        p_max_age: null,
        p_material_url: WIKI,
      }),
    );
    expect(approval.status).toBe(200);
    expect(approval.row).toMatchObject({
      fee_note: "음료 5,000원 + 자료 5,000원",
      join_type: "approval",
      approval_criteria: "필름 카메라가 있는 분",
      min_age: 25,
      max_age: null,
      material_url: WIKI,
    });

    const back = await update(request, host, await sameAs(id, { p_join_type: "first_come", p_material_url: "" }));
    expect(back.row).toMatchObject({
      join_type: "first_come",
      approval_criteria: null,
      min_age: null,
      max_age: null,
      material_url: null,
    });
  });

  test("U5 P08: 호스트 승인으로 바꾸거나 기준 없이 열린 호스트 승인 소셜링을 고치려면 승인 기준이 필요하다", async ({
    request,
  }) => {
    const host = await newHost(request, "v2-update-criteria");
    const [firstCome, noCriteria] = await Promise.all([
      fixture(host),
      // MS14 전에 기준 없이 연 호스트 승인 소셜링
      fixture(host, { joinType: "approval" }),
    ]);
    expect((await update(request, host, await sameAs(firstCome, { p_join_type: "approval" }))).code).toBe(
      "INVALID_INPUT",
    );
    expect((await update(request, host, await sameAs(noCriteria))).code).toBe("INVALID_INPUT");
    const filled = await update(request, host, await sameAs(noCriteria, { p_approval_criteria: "처음 오시는 분 환영해요" }));
    expect(filled.status).toBe(200);
    expect(filled.row.approval_criteria).toBe("처음 오시는 분 환영해요");
  });

  test("U3 잠금(P08-02): 참여 확정자가 있으면 적힌 참가비 설명을 바꿀 수 없고, 비어 있던 설명은 채울 수 있다", async ({
    request,
  }) => {
    const host = await newHost(request, "v2-update-lock");
    const [noted, empty] = await Promise.all([
      fixture(host, { fee: 15000, feeNote: FEE_NOTE, capacity: 6, accepted: ["P1"] }),
      // MS14 전에 설명 없이 연 유료 소셜링
      fixture(host, { fee: 15000, capacity: 6, accepted: ["P1"] }),
    ]);

    expect((await update(request, host, await sameAs(noted, { p_fee_note: "음료 15,000원" }))).code).toBe("LOCKED_FIELD");
    // 앞뒤 공백만 다르면 같은 설명
    const same = await update(request, host, await sameAs(noted, { p_fee_note: ` ${FEE_NOTE} `, p_capacity: 8 }));
    expect(same.status).toBe(200);
    expect(same.row.fee_note).toBe(FEE_NOTE);

    // 비어 있던 설명은 채워야 저장되고, 채울 수 있다
    expect((await update(request, host, await sameAs(empty))).code).toBe("INVALID_INPUT");
    const filled = await update(request, host, await sameAs(empty, { p_fee_note: "음료 15,000원" }));
    expect(filled.status).toBe(200);
    expect(filled.row.fee_note).toBe("음료 15,000원");

    // 참여 확정자가 없으면 설명을 바꿀 수 있다
    const open = await fixture(host, { fee: 15000, feeNote: FEE_NOTE });
    expect((await update(request, host, await sameAs(open, { p_fee_note: "음료 15,000원" }))).row.fee_note).toBe(
      "음료 15,000원",
    );
  });

  test("지금 수정 검사는 그대로: NOT_HOST, INVALID_STATE, 총 참가비 잠금, 비로그인은 부를 수 없다", async ({
    request,
  }) => {
    const host = await newHost(request, "v2-update-guard");
    const other = await newHost(request, "v2-update-guard-other");
    const [open, canceled, locked] = await Promise.all([
      fixture(host, { fee: 10000, feeNote: "음료 10,000원" }),
      fixture(host, { status: "canceled", fee: 10000, feeNote: "음료 10,000원" }),
      fixture(host, { fee: 10000, feeNote: "음료 10,000원", accepted: ["P2"] }),
    ]);
    expect((await update(request, other, await sameAs(open))).code).toBe("NOT_HOST");
    expect((await update(request, host, await sameAs(canceled))).code).toBe("INVALID_STATE");
    expect((await update(request, host, await sameAs(locked, { p_fee: 12000 }))).code).toBe("LOCKED_FIELD");
    expect((await rpc(request, "update_socialing_v2", await sameAs(open))).status).not.toBe(200);
  });
});
