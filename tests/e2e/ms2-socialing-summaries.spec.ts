import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  apiHeaders,
  createFixtureSocialing,
  deleteFixtureSocialings,
  supabaseUrl,
  type FixtureOptions,
} from "./helpers/supabase";

// MS2 읽기 뷰 socialing_summaries (architecture 3.2, spec 3.2·8.3·8.4, screen-cases C03~C10)
// 비로그인(publishable 키)으로 읽는다. 테스트 전용 [E2E] 소셜링을 만들고 끝에 지운다.

type Summary = {
  id: number;
  status: string;
  accepted_count: number;
  is_past: boolean;
  can_apply: boolean;
  status_tag: "closed" | "full" | null;
  closed_reason: string | null;
};

async function readSummaries(request: APIRequestContext, ids: number[]): Promise<Map<number, Summary>> {
  const select = "id,status,accepted_count,is_past,can_apply,status_tag,closed_reason";
  const response = await request.get(
    `${supabaseUrl}/rest/v1/socialing_summaries?select=${select}&id=in.(${ids.join(",")})`,
    { headers: apiHeaders() },
  );
  expect(response.status()).toBe(200);
  const rows: Summary[] = await response.json();
  return new Map(rows.map((row) => [row.id, row]));
}

// 정원 2명, 호스트 B. 참여 확정 2명이면 정원 마감
const FULL: FixtureOptions["accepted"] = ["A", "P1"];

const CASES: {
  name: string;
  options: Omit<FixtureOptions, "host" | "capacity">;
  expected: Omit<Summary, "id" | "status">;
}[] = [
  {
    name: "C03 모집중",
    options: { status: "recruiting" },
    expected: { accepted_count: 0, is_past: false, can_apply: true, status_tag: null, closed_reason: null },
  },
  {
    name: "C04 모집중 + 신청 마감",
    options: { status: "recruiting", deadlineInHours: -1 },
    expected: { accepted_count: 0, is_past: false, can_apply: false, status_tag: "closed", closed_reason: "deadline" },
  },
  {
    name: "C05 모집중 + 정원 마감",
    options: { status: "recruiting", accepted: FULL },
    expected: { accepted_count: 2, is_past: false, can_apply: false, status_tag: "full", closed_reason: "full" },
  },
  {
    name: "C06 확정",
    options: { status: "confirmed", accepted: ["A"] },
    expected: { accepted_count: 1, is_past: false, can_apply: true, status_tag: null, closed_reason: null },
  },
  {
    name: "C07 확정 + 신청 마감",
    options: { status: "confirmed", deadlineInHours: -1 },
    expected: { accepted_count: 0, is_past: false, can_apply: false, status_tag: "closed", closed_reason: "deadline" },
  },
  {
    name: "C08 확정 + 정원 마감",
    options: { status: "confirmed", accepted: FULL },
    expected: { accepted_count: 2, is_past: false, can_apply: false, status_tag: "full", closed_reason: "full" },
  },
  {
    name: "C09 종료 (지난 소셜링, 꼬리표 없음)",
    options: { status: "completed", deadlineInHours: -3, startsInHours: -2, accepted: ["A"] },
    expected: { accepted_count: 1, is_past: true, can_apply: false, status_tag: null, closed_reason: "started" },
  },
  {
    name: "C10 호스트 취소 (꼬리표 없음)",
    options: { status: "canceled" },
    expected: { accepted_count: 0, is_past: false, can_apply: false, status_tag: null, closed_reason: "host_canceled" },
  },
  {
    name: "신청 마감과 정원 마감이 겹치면 '신청 마감'",
    options: { status: "recruiting", deadlineInHours: -1, accepted: FULL },
    expected: { accepted_count: 2, is_past: false, can_apply: false, status_tag: "closed", closed_reason: "deadline" },
  },
  {
    name: "확정 안 된 채 일시가 지난 모집중: 지난 소셜링 + 신청 마감",
    options: { status: "recruiting", deadlineInHours: -3, startsInHours: -2 },
    expected: { accepted_count: 0, is_past: true, can_apply: false, status_tag: "closed", closed_reason: "started" },
  },
];

test.describe("MS2 읽기 뷰 socialing_summaries", () => {
  test.describe.configure({ mode: "serial" });

  const created: number[] = [];
  test.afterAll(async () => {
    await deleteFixtureSocialings(created);
  });

  test("C03~C10: 상태 배지·꼬리표 조합과 신청 가능·불가 이유를 DB가 계산한다", async ({ request }) => {
    // 10개를 하나씩 만들면 전체 E2E 중에는 30초 제한에 가까워져서 한꺼번에 만든다 (순서는 CASES 그대로)
    const ids = await Promise.all(
      CASES.map(({ options }) => createFixtureSocialing({ host: "B", capacity: 2, ...options })),
    );
    created.push(...ids);

    const summaries = await readSummaries(request, ids);
    CASES.forEach(({ name, options, expected }, index) => {
      const row = summaries.get(ids[index]);
      expect(row, name).toBeDefined();
      expect({ ...row, id: undefined }, name).toEqual({ ...expected, status: options.status, id: undefined });
    });
  });

  test("비로그인은 참여 확정 인원(숫자)만 보고, 신청 행은 여전히 보이지 않는다", async ({ request }) => {
    const id = await createFixtureSocialing({ host: "B", capacity: 2, accepted: FULL });
    created.push(id);

    expect((await readSummaries(request, [id])).get(id)?.accepted_count).toBe(2);

    const applications = await request.get(`${supabaseUrl}/rest/v1/applications?select=id&socialing_id=eq.${id}`, {
      headers: apiHeaders(),
    });
    if (applications.ok()) {
      expect(await applications.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(applications.status());
    }
  });

  test("뷰는 읽기만 된다", async ({ request }) => {
    const id = await createFixtureSocialing({ host: "B" });
    created.push(id);

    // 비로그인에게는 SELECT 권한만 준다. 여러 테이블을 잇는 뷰라 Postgres가 권한 검사 전에 막을 수도 있어
    // 응답 코드는 하나로 정하지 않고, 거절되었는지와 값이 그대로인지를 본다.
    const update = await request.patch(`${supabaseUrl}/rest/v1/socialing_summaries?id=eq.${id}`, {
      headers: apiHeaders(),
      data: { title: "[E2E] 바뀌면 안 됨" },
    });
    expect(update.ok()).toBe(false);

    const after = await request.get(`${supabaseUrl}/rest/v1/socialing_summaries?select=title&id=eq.${id}`, {
      headers: apiHeaders(),
    });
    expect((await after.json())[0].title).not.toBe("[E2E] 바뀌면 안 됨");
  });
});
