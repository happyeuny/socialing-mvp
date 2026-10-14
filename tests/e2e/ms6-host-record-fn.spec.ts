import { expect, test, type APIRequestContext } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import { DEMO_USERS } from "../../scripts/seed-data.mts";
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

// MS6 get_host_record: 호스트 기록 집계 함수 (architecture 3.2, spec M5·6장, tasks MS6 완료 기준 3 "호스트 기록 계산 규칙")
// 시드 호스트는 다른 테스트가 잠깐 만드는 소셜링 때문에 전체 E2E 도중 숫자가 바뀐다. 그래서 테스트마다 전용 호스트 계정을
// 가입시켜 그 계정의 [E2E] 소셜링만으로 센다. 끝에 소셜링(신청·후기·비공개 응답 포함)과 계정을 지운다.

const createdSocialings: number[] = [];
const createdUsers: TestUser[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(createdSocialings);
  await deleteAuthUsers(createdUsers.map((user) => user.email));
});

type HostRecord = {
  opened_count: number;
  canceled_count: number;
  review_count: number;
  response_count: number;
  match_rate: number | null;
  is_new_host: boolean;
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

const HOUR = 1;
const DAY = 24 * HOUR;
// 종료: 어제 열림
const COMPLETED: Partial<FixtureOptions> = { status: "completed", deadlineInHours: -26, startsInHours: -25 };
// 6개월보다 오래됨 (210일 전)
const OLD = { deadlineInHours: -210 * DAY - 1, startsInHours: -210 * DAY };
// 6개월 안 (150일 전)
const FIVE_MONTHS_AGO = { deadlineInHours: -150 * DAY - 1, startsInHours: -150 * DAY };

test.describe("MS6 get_host_record", () => {
  test("열린 소셜링·호스트 취소는 정해진 경우만 세고, 소셜링 일시가 6개월보다 오래되면 빠진다", async ({ request }) => {
    const host = await newHost(request, "record-count");

    const [, completedNoAccepted, canceledPending, , canceledRejected, canceledWithdrawn, , , , futureCanceled] =
      await Promise.all([
        // 열린 소셜링으로 셈: 종료 + 참여 확정자 1명 이상 (어제, 150일 전)
        fixture(host, { ...COMPLETED, accepted: ["P1"] }),
        // 안 셈: 종료했지만 참여 확정자 없음 (거절만)
        fixture(host, { ...COMPLETED }),
        // 호스트 취소로 셈: 승인 대기 신청이 있던 채 취소
        fixture(host, { status: "canceled", joinType: "approval" }),
        // 호스트 취소로 셈: 참여 확정자가 있던 채 취소
        fixture(host, { status: "canceled", accepted: ["P2"] }),
        // 안 셈: 거절만 있던 취소
        fixture(host, { status: "canceled", joinType: "approval" }),
        // 안 셈: 신청 취소만 있던 취소
        fixture(host, { status: "canceled" }),
        // 안 셈: 신청이 없던 취소
        fixture(host, { status: "canceled" }),
        // 6개월보다 오래됨: 열린 소셜링·호스트 취소 둘 다 빠짐
        fixture(host, { ...OLD, status: "completed", accepted: ["P1"] }),
        fixture(host, { ...OLD, status: "canceled", accepted: ["P1"] }),
        // 앞으로 열릴 소셜링을 승인 대기가 있는 채 취소해도 바로 셈
        fixture(host, { status: "canceled", joinType: "approval" }),
      ]);
    await Promise.all([
      fixture(host, { ...FIVE_MONTHS_AGO, status: "completed", accepted: ["P3"] }),
      addApplication(completedNoAccepted, "P2", "rejected"),
      addApplication(canceledPending, "P1", "pending"),
      addApplication(canceledRejected, "P3", "rejected"),
      addApplication(canceledWithdrawn, "P4", "canceled"),
      addApplication(futureCanceled, "P5", "pending"),
    ]);

    const record = await hostRecord(request, host.id);
    expect(record.opened_count).toBe(2);
    expect(record.canceled_count).toBe(3);
    expect(record.review_count).toBe(0);
    expect(record.response_count).toBe(0);
    expect(record.match_rate).toBeNull();
    expect(record.is_new_host).toBe(true);
  });

  test("소개 일치 비율: 응답 4건이면 없고 5건부터 ①예 ②아니오 ③예 비율, 6개월보다 오래된 후기는 빠진다", async ({
    request,
  }) => {
    const host = await newHost(request, "record-ratio");
    const [recent, old] = await Promise.all([
      fixture(host, { ...COMPLETED, capacity: 6, accepted: ["A", "P1", "P2", "P3", "P4", "P5"] }),
      fixture(host, { ...OLD, status: "completed", accepted: ["P1"] }),
    ]);

    await Promise.all([
      addReview(recent, "A", { checks: [true, false, true] }), // 일치
      addReview(recent, "P1", { checks: [false, false, true] }), // ① 아니오
      addReview(recent, "P2", { checks: [true, true, true] }), // ② 돈을 요구받음
      addReview(recent, "P3", { checks: [true, false, false] }), // ③ 아니오
      addReview(old, "P1", { checks: [true, false, true] }), // 6개월보다 오래된 소셜링
    ]);
    let record = await hostRecord(request, host.id);
    expect(record.review_count).toBe(4);
    expect(record.response_count).toBe(4);
    expect(record.match_rate).toBeNull();

    await addReview(recent, "P4", { checks: [true, false, true] }); // 일치
    record = await hostRecord(request, host.id);
    expect(record.review_count).toBe(5);
    expect(record.response_count).toBe(5);
    expect(record.match_rate).toBeCloseTo(2 / 5, 6);
  });

  test("새 호스트: 열린 소셜링 2회면 새 호스트, 3회부터 아니다", async ({ request }) => {
    const host = await newHost(request, "record-new");
    await Promise.all([
      fixture(host, { ...COMPLETED, accepted: ["P1"] }),
      fixture(host, { ...FIVE_MONTHS_AGO, status: "completed", accepted: ["P2"] }),
    ]);
    let record = await hostRecord(request, host.id);
    expect(record.opened_count).toBe(2);
    expect(record.is_new_host).toBe(true);

    await fixture(host, { ...COMPLETED, accepted: ["P3"] });
    record = await hostRecord(request, host.id);
    expect(record.opened_count).toBe(3);
    expect(record.is_new_host).toBe(false);
  });

  test("비로그인도 부를 수 있고 합계만 돌려준다. 비공개 응답은 여전히 직접 읽을 수 없다", async ({ request }) => {
    const [b] = await runQuery<{ id: string }>(
      `select id from auth.users where email = '${DEMO_USERS.B.email}';`,
    );
    const record = await hostRecord(request, b.id);
    expect(Object.keys(record).sort()).toEqual(
      [
        "canceled_count",
        "is_new_host",
        "is_trusted_host",
        "match_rate",
        "opened_count",
        "response_count",
        "review_count",
      ],
    );
    // 시드 B: 새 호스트가 아니고 응답이 5건 이상이라 비율이 보인다 (다른 테스트가 B 소셜링을 잠깐 더해도 바뀌지 않는 조건)
    expect(record.is_new_host).toBe(false);
    expect(record.response_count).toBeGreaterThanOrEqual(5);
    expect(typeof record.match_rate).toBe("number");

    const checks = await request.get(`${supabaseUrl}/rest/v1/review_checks?select=*`, { headers: apiHeaders() });
    const rows = checks.ok() ? await checks.json() : [];
    expect(rows).toEqual([]);
  });
});
