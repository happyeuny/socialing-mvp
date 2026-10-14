import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { DEMO_USERS, hostRecordFromSeed, seedSocialings, type DemoUserKey } from "../../scripts/seed-data.mts";
import {
  addApplication,
  addReview,
  apiHeaders,
  createFixtureSocialing,
  createTestUser,
  deleteAuthUsers,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
  type TestUser,
} from "./helpers/supabase";

// MS8 기준 공개 등급: get_host_record의 is_trusted_host (architecture 3.2, spec M5·6장)
// "믿고 가는 호스트" = 열린 소셜링 5회 이상 + 호스트 취소 0회 + 소개 일치 90% 이상(반올림 전 값, 응답 5건 이상).
// 시드 호스트는 다른 테스트가 잠깐 만드는 소셜링 때문에 숫자가 바뀌므로, 경계 값은 테스트마다 가입시킨 전용 호스트로 본다.
// 끝에 소셜링(신청·후기·비공개 응답 포함)과 계정을 지운다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

type HostRecord = {
  opened_count: number;
  canceled_count: number;
  response_count: number;
  match_rate: number | null;
  is_trusted_host: boolean;
};

async function newHost(request: APIRequestContext, label: string) {
  const host = await createTestUser(request, label);
  createdUsers.push(host);
  return host;
}

async function fixture(host: TestUser, options: Partial<FixtureOptions>) {
  const id = await createFixtureSocialing({ host, ...options });
  createdSocialings.push(id);
  return id;
}

/** 비로그인(publishable 키)으로 함수를 부른다 */
async function hostRecord(request: APIRequestContext, hostId: string): Promise<HostRecord> {
  const response = await request.post(`${supabaseUrl}/rest/v1/rpc/get_host_record`, {
    headers: apiHeaders(),
    data: { p_host_id: hostId },
  });
  expect(response.status()).toBe(200);
  const rows = (await response.json()) as HostRecord[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

// 종료: 어제 열림
const COMPLETED: Partial<FixtureOptions> = { status: "completed", deadlineInHours: -26, startsInHours: -25 };
const FIVE: DemoUserKey[] = ["A", "P1", "P2", "P3", "P4"];
const MATCH: [boolean, boolean, boolean] = [true, false, true];
const NO_MATCH: [boolean, boolean, boolean] = [true, true, true]; // ② 금액 외에 돈을 요구받음

test.describe("MS8 get_host_record 등급", () => {
  test("열린 소셜링 4회면 아니고 5회부터 등급, 그 뒤 호스트 취소가 1회 생기면 다시 아니다", async ({ request }) => {
    const host = await newHost(request, "trusted-opened");
    // 응답 5건 모두 일치(100%), 열린 소셜링 4회
    const [reviewed] = await Promise.all([
      fixture(host, { ...COMPLETED, capacity: 5, accepted: FIVE }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
    ]);
    await Promise.all(FIVE.map((user) => addReview(reviewed, user, { checks: MATCH })));

    let record = await hostRecord(request, host.id);
    expect(record).toMatchObject({ opened_count: 4, canceled_count: 0, response_count: 5, match_rate: 1 });
    expect(record.is_trusted_host).toBe(false);

    await fixture(host, { ...COMPLETED, accepted: ["P5"] });
    record = await hostRecord(request, host.id);
    expect(record.opened_count).toBe(5);
    expect(record.is_trusted_host).toBe(true);

    // 승인 대기 신청이 있던 채 호스트 취소 → 호스트 취소 1회
    const canceled = await fixture(host, { status: "canceled", joinType: "approval" });
    await addApplication(canceled, "P1", "pending");
    record = await hostRecord(request, host.id);
    expect(record.canceled_count).toBe(1);
    expect(record.is_trusted_host).toBe(false);
  });

  test("소개 일치: 응답 4건이면 비율이 없어 아니고, 8/9(89%)면 아니고, 9/10(딱 90%)부터 등급", async ({ request }) => {
    const host = await newHost(request, "trusted-ratio");
    // 열린 소셜링 5회, 호스트 취소 0회
    const [first, second] = await Promise.all([
      fixture(host, { ...COMPLETED, capacity: 5, accepted: FIVE }),
      fixture(host, { ...COMPLETED, capacity: 5, accepted: FIVE }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
      fixture(host, { ...COMPLETED, accepted: ["P5"] }),
    ]);

    // 응답 4건, 모두 일치
    await Promise.all(["A", "P1", "P2", "P3"].map((user) => addReview(first, user as DemoUserKey, { checks: MATCH })));
    let record = await hostRecord(request, host.id);
    expect(record).toMatchObject({ opened_count: 5, canceled_count: 0, response_count: 4, match_rate: null });
    expect(record.is_trusted_host).toBe(false);

    // 응답 9건 중 8건 일치 (0.888…, 화면으로는 89%)
    await Promise.all([
      addReview(first, "P4", { checks: MATCH }),
      ...(["A", "P1", "P2"] as const).map((user) => addReview(second, user, { checks: MATCH })),
      addReview(second, "P3", { checks: NO_MATCH }),
    ]);
    record = await hostRecord(request, host.id);
    expect(record.response_count).toBe(9);
    expect(record.match_rate).toBeCloseTo(8 / 9, 6);
    expect(record.is_trusted_host).toBe(false);

    // 응답 10건 중 9건 일치 (딱 90%)
    await addReview(second, "P4", { checks: MATCH });
    record = await hostRecord(request, host.id);
    expect(record.response_count).toBe(10);
    expect(record.match_rate).toBeCloseTo(0.9, 6);
    expect(record.is_trusted_host).toBe(true);
  });

  test("시드: 호스트 B는 등급, C(새 호스트)·D(숫자만)는 아니다. 시드 정의의 계산과 같다", async ({ request }) => {
    const definitions = seedSocialings();
    const hosts = ["B", "C", "D"] as const;
    const rows = await runQuery<{ email: string; id: string }>(
      `select email, id from auth.users where email in (${hosts.map((key) => `'${DEMO_USERS[key].email}'`).join(", ")});`,
    );
    for (const key of hosts) {
      const id = rows.find((row) => row.email === DEMO_USERS[key].email)?.id;
      expect(id, `시드 계정 ${key}`).toBeTruthy();
      const record = await hostRecord(request, id!);
      expect(record.is_trusted_host, `호스트 ${key}`).toBe(hostRecordFromSeed(definitions, key).isTrusted);
    }
    expect(hostRecordFromSeed(definitions, "B").isTrusted).toBe(true);
  });
});
