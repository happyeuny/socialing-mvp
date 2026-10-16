import { expect, test } from "@playwright/test";
import { runQuery } from "../../scripts/lib/management-api.mts";
import {
  apiHeaders,
  callInDbHolding,
  createFixtureSocialing,
  deleteFixtureSocialings,
  readAs,
  rpc,
  signIn,
  supabaseUrl,
} from "./helpers/supabase";

// MS14 create_report · reports: 신고 접수 (SH4b, architecture 3.1·4·5장, spec M4·8.9 P03)
// 접수(저장)까지만. 신고한 본인만 자기 행을 읽고, 호스트와 다른 사람은 읽지 못한다. 직접 쓰기는 없다.
// 시드 데이터는 건드리지 않고, 호스트 C의 테스트 전용 소셜링에 신고한다(소셜링을 지우면 신고도 지워진다).

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

type ReportReason = "solicitation" | "extra_money" | "fake_participant" | "unwanted_contact" | "other";
const report = (socialingId: number, reason: ReportReason | null, note: string | null = null) => ({
  p_socialing_id: socialingId,
  p_reason: reason,
  p_note: note,
});

type ReportRow = { socialing_id: number; reason: string; note: string | null };

test.describe("MS14 create_report", () => {
  test("SH4b: 로그인한 사람은 신청하지 않았어도 신고할 수 있고, 만든 신고 행을 돌려준다(설명 앞뒤 공백 뺌)", async ({
    request,
  }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ host: "C" });
    const result = await rpc(request, "create_report", report(id, "solicitation", "  소개 글에 영업 링크가 있어요 "), p1);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ socialing_id: id, reason: "solicitation", note: "소개 글에 영업 링크가 있어요" });

    // 설명은 선택(그 밖의 문제가 아니면), 빈칸은 null
    const p2 = await signIn(request, "P2");
    const blank = await rpc(request, "create_report", report(id, "unwanted_contact", "   "), p2);
    expect(blank.body).toMatchObject({ reason: "unwanted_contact", note: null });
  });

  test("이미 신고했으면 ALREADY_REPORTED, 호스트 본인은 IS_HOST, 비로그인은 부를 수 없다", async ({ request }) => {
    const [p1, host] = await Promise.all([signIn(request, "P1"), signIn(request, "C")]);
    const id = await fixture({ host: "C" });
    expect((await rpc(request, "create_report", report(id, "extra_money"), p1)).status).toBe(200);
    expect((await rpc(request, "create_report", report(id, "other", "다른 사유로 한 번 더"), p1)).body.message).toBe(
      "ALREADY_REPORTED",
    );
    expect((await rpc(request, "create_report", report(id, "extra_money"), host)).body.message).toBe("IS_HOST");
    expect((await rpc(request, "create_report", report(id, "extra_money"))).status).not.toBe(200);
  });

  test("상태와 관계없이 신고할 수 있다 (종료·호스트 취소·지난 소셜링)", async ({ request }) => {
    const p1 = await signIn(request, "P1");
    const ids = await Promise.all([
      fixture({ host: "C", status: "completed", deadlineInHours: -3, startsInHours: -1 }),
      fixture({ host: "C", status: "canceled" }),
      fixture({ host: "C", deadlineInHours: -3, startsInHours: -1 }),
    ]);
    const results = await Promise.all(ids.map((id) => rpc(request, "create_report", report(id, "fake_participant"), p1)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  test("사유·설명 범위: 사유 없음, 그 밖의 문제인데 설명 없음, 설명 301자, 없는 소셜링은 INVALID_INPUT", async ({
    request,
  }) => {
    const p1 = await signIn(request, "P1");
    const id = await fixture({ host: "C" });
    for (const [name, args] of [
      ["사유 없음", report(id, null)],
      ["그 밖의 문제 + 설명 없음", report(id, "other", "  ")],
      ["설명 301자", report(id, "solicitation", "가".repeat(301))],
      ["없는 소셜링", report(999999999, "solicitation")],
    ] as const) {
      expect((await rpc(request, "create_report", args, p1)).body.message, name).toBe("INVALID_INPUT");
    }
    const ok = await rpc(request, "create_report", report(id, "other", "가".repeat(300)), p1);
    expect(ok.body).toMatchObject({ reason: "other", note: "가".repeat(300) });
  });

  test("동시에 두 번 보내도 하나만 접수된다 (유니크 제약 → ALREADY_REPORTED)", async () => {
    const id = await fixture({ host: "C" });
    const call = `public.create_report(${id}, 'solicitation'::public.report_reason, null)`;
    const results = await Promise.all([callInDbHolding("P3", call, 2), callInDbHolding("P3", call, 2)]);
    expect(results.sort()).toEqual(["ALREADY_REPORTED", "OK"]);
    const [{ count }] = await runQuery<{ count: number }>(
      `select count(*)::int as count from public.reports where socialing_id = ${id};`,
    );
    expect(count).toBe(1);
  });

  test("권한: 신고한 본인만 자기 신고를 읽고, 호스트·다른 사람·비로그인은 읽지 못하며 직접 쓸 수 없다", async ({
    request,
  }) => {
    const [p1, p2, host] = await Promise.all([signIn(request, "P1"), signIn(request, "P2"), signIn(request, "C")]);
    const id = await fixture({ host: "C" });
    await rpc(request, "create_report", report(id, "extra_money", "현장에서 돈을 더 냈어요"), p1);

    const path = `reports?select=socialing_id,reason,note&socialing_id=eq.${id}`;
    expect((await readAs<ReportRow>(request, path, p1)).rows).toEqual([
      { socialing_id: id, reason: "extra_money", note: "현장에서 돈을 더 냈어요" },
    ]);
    expect((await readAs(request, path, p2)).rows).toEqual([]);
    expect((await readAs(request, path, host)).rows).toEqual([]);
    expect((await readAs(request, path)).status).not.toBe(200);

    // 직접 쓰기(추가·고치기·지우기)는 거부된다
    const insert = await request.post(`${supabaseUrl}/rest/v1/reports`, {
      headers: apiHeaders(p2),
      data: { socialing_id: id, reason: "solicitation" },
    });
    expect(insert.status()).not.toBe(201);
    await request.patch(`${supabaseUrl}/rest/v1/reports?socialing_id=eq.${id}`, {
      headers: apiHeaders(p1),
      data: { reason: "other", note: "고침" },
    });
    await request.delete(`${supabaseUrl}/rest/v1/reports?socialing_id=eq.${id}`, { headers: apiHeaders(p1) });
    expect(await runQuery(`select reason, note from public.reports where socialing_id = ${id};`)).toEqual([
      { reason: "extra_money", note: "현장에서 돈을 더 냈어요" },
    ]);
  });
});
