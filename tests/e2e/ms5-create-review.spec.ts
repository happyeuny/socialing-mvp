import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  addApplication,
  addReview,
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  rpc,
  signIn,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS5 create_review: 인증 후기 쓰기 함수 (architecture 5장, spec 3.4·M9·6장, tasks MS5 완료 기준 2)
// 시드 데이터는 건드리지 않고, 호스트 C의 테스트 전용 소셜링을 만들고 지운다(후기·비공개 응답도 함께 지워진다).
// 사진 경로 확인용으로 올린 작은 파일은 버킷에 남고 다음 `npm run seed`가 비운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

// 종료된 소셜링 (어제 열림)
const COMPLETED: Partial<FixtureOptions> = { status: "completed", deadlineInHours: -26, startsInHours: -25 };

async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({ host: "C", ...COMPLETED, ...options });
  created.push(id);
  return id;
}

const BODY = "소개에 적힌 대로 진행돼서 편하게 참여했어요.";
const MATCH = { p_members_match: true, p_extra_money: false, p_content_match: true };

function review(socialingId: number, change: Record<string, unknown> = {}) {
  return { p_socialing_id: socialingId, p_body: BODY, p_photo_path: null, ...MATCH, ...change };
}

/** 로그인 토큰의 사용자 id */
function userIdOf(accessToken: string): string {
  return JSON.parse(Buffer.from(accessToken.split(".")[1], "base64url").toString()).sub;
}

/** 로그인한 사람으로 review-photos에 작은 파일을 올리고 경로를 돌려준다 */
async function uploadPhoto(request: APIRequestContext, accessToken: string, folder = userIdOf(accessToken)) {
  const path = `${folder}/${randomUUID()}.jpg`;
  const response = await request.post(`${supabaseUrl}/storage/v1/object/review-photos/${path}`, {
    headers: { ...apiHeaders(accessToken), "Content-Type": "image/jpeg" },
    data: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  expect(response.status(), "사진 올리기").toBe(200);
  return path;
}

async function reviewsOf(socialingId: number) {
  return runQuery<{ body: string; photo_path: string | null; members_match: boolean; extra_money: boolean; content_match: boolean }>(`
    select r.body, r.photo_path, c.members_match, c.extra_money, c.content_match
    from public.reviews r left join public.review_checks c on c.review_id = r.id
    where r.socialing_id = ${socialingId}
    order by r.id;
  `);
}

test.describe("MS5 create_review", () => {
  test("8단계: 참여 확정자가 종료된 소셜링에 후기를 쓰면 후기 행을 돌려주고 비공개 응답도 함께 저장한다", async ({
    request,
  }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ accepted: ["P1"] });

    const result = await rpc(request, "create_review", review(id, { p_body: `  ${BODY}\n` }), p1);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ socialing_id: id, body: BODY, photo_path: null });
    // 돌려주는 행에 비공개 응답은 없다
    expect(Object.keys(result.body)).not.toContain("members_match");

    expect(await reviewsOf(id)).toEqual([
      { body: BODY, photo_path: null, members_match: true, extra_money: false, content_match: true },
    ]);
  });

  test("사진은 내 폴더에 실제로 올린 파일이면 받는다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ accepted: ["P1"] });
    const path = await uploadPhoto(request, p1);

    const answers = { p_members_match: false, p_extra_money: true, p_content_match: false };
    const result = await rpc(request, "create_review", review(id, { p_photo_path: path, ...answers }), p1);
    expect(result.status).toBe(200);
    expect(await reviewsOf(id)).toEqual([
      { body: BODY, photo_path: path, members_match: false, extra_money: true, content_match: false },
    ]);
  });

  test("완료 기준: 참여 확정자가 아니면 거부한다 (신청 없음, 승인 대기, 거절, 신청 취소, 호스트, 비로그인)", async ({
    request,
  }) => {
    const id = await fixture({ capacity: 6 });
    await addApplication(id, "P1", "pending");
    await addApplication(id, "P2", "rejected");
    await addApplication(id, "P3", "canceled");

    for (const user of ["P1", "P2", "P3", "P4", "C"] as const) {
      const token = await signIn(request, user);
      expect((await rpc(request, "create_review", review(id), token)).body.message, user).toBe("NOT_ELIGIBLE");
    }
    // 비로그인은 함수를 부를 수 없다
    expect((await rpc(request, "create_review", review(id))).status).not.toBe(200);
    expect(await reviewsOf(id)).toEqual([]);
  });

  test("E08: 종료 전이면 INVALID_STATE (모집중, 확정·일시 지남, 호스트 취소)", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const cases = [
      { status: "recruiting" },
      { status: "confirmed", deadlineInHours: -3, startsInHours: -1 },
      { status: "canceled" },
    ] as const;
    for (const options of cases) {
      const id = await fixture({ deadlineInHours: 24, startsInHours: 48, ...options, accepted: ["P1"] });
      expect((await rpc(request, "create_review", review(id), p1)).body.message, options.status).toBe("INVALID_STATE");
      expect(await reviewsOf(id)).toEqual([]);
    }
  });

  test("E09: 한 소셜링에 한 번만 쓴다 (ALREADY_REVIEWED)", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ accepted: ["P1"] });
    await addReview(id, "P1");

    expect((await rpc(request, "create_review", review(id), p1)).body.message).toBe("ALREADY_REVIEWED");
    expect(await reviewsOf(id)).toHaveLength(1);
  });

  test("동시에 두 번 올려도 후기는 하나만 생긴다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ accepted: ["P1"] });

    const results = await Promise.all([1, 2].map(() => rpc(request, "create_review", review(id), p1)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.find((r) => r.status !== 200)?.body.message).toBe("ALREADY_REVIEWED");
    expect(await reviewsOf(id)).toHaveLength(1);
  });

  test("받을 수 없는 입력은 INVALID_INPUT이고 아무것도 저장하지 않는다", async ({ request }) => {
    const [p1, p2] = await Promise.all([signIn(request, "P1"), signIn(request, "P2")]);
    const id = await fixture({ accepted: ["P1"] });
    const othersPhoto = await uploadPhoto(request, p2);
    const myFolder = userIdOf(p1);

    const cases: [string, Record<string, unknown>][] = [
      ["없는 소셜링", { p_socialing_id: -1 }],
      ["글 9자", { p_body: "123456789" }],
      ["공백을 빼면 9자", { p_body: "   123456789   " }],
      ["글 501자", { p_body: "가".repeat(501) }],
      ["글 없음", { p_body: null }],
      ["질문 ① 답 없음", { p_members_match: null }],
      ["질문 ② 답 없음", { p_extra_money: null }],
      ["질문 ③ 답 없음", { p_content_match: null }],
      ["다른 사람 폴더의 사진", { p_photo_path: othersPhoto }],
      ["올리지 않은 사진", { p_photo_path: `${myFolder}/${randomUUID()}.jpg` }],
      ["폴더 밖 경로", { p_photo_path: `${myFolder}/../${othersPhoto}` }],
    ];
    for (const [name, change] of cases) {
      expect((await rpc(request, "create_review", review(id, change), p1)).body.message, name).toBe("INVALID_INPUT");
    }
    expect(await reviewsOf(id)).toEqual([]);

    // 경계값 10자·500자는 된다
    const edge = await fixture({ accepted: ["P1", "P2"], capacity: 4 });
    expect((await rpc(request, "create_review", review(edge, { p_body: "1234567890" }), p1)).status).toBe(200);
    expect((await rpc(request, "create_review", review(edge, { p_body: "가".repeat(500) }), p2)).status).toBe(200);
  });

  test("후기를 쓴 사람도 비공개 응답(review_checks)은 읽을 수 없다", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ accepted: ["P1"] });
    expect((await rpc(request, "create_review", review(id), p1)).status).toBe(200);

    const response = await request.get(`${supabaseUrl}/rest/v1/review_checks?select=*`, { headers: apiHeaders(p1) });
    if (response.ok()) {
      expect(await response.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });
});
