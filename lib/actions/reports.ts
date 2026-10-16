"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { reportSchema, type ReportReason } from "@/lib/validation/report";

// 신고하기 (SH4b, spec M4·8.6 P03). 버튼 하나 = 서버 액션 하나 = DB 함수 하나(create_report).
// 접수(저장)까지만 한다. 처리·결과 알림·호스트 기록 반영은 없다(spec 10장). 입력은 시트와 같은 규칙으로 한 번 더 보고, 함수가 다시 확인한다.

export type ReportResult =
  /** 접수됨. 그사이 이미 신고했어도(ALREADY_REPORTED) 결과는 같다 */
  | { ok: true }
  /** 네트워크·서버 오류, 받을 수 없는 입력 → 시트를 연 채 다시 시도 */
  | { ok: false; retry: true };

export async function createReport(socialingId: number, reason: ReportReason, note: string): Promise<ReportResult> {
  const parsed = reportSchema.safeParse({ socialingId, reason, note });
  if (!parsed.success) return { ok: false, retry: true };
  const detailPath = `/socialings/${parsed.data.socialingId}`;

  const supabase = await createClient();
  // 로그인이 끊겼으면 로그인 화면으로 보냈다가 상세로 돌아온다 (spec 8.6 권한 오류)
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", detailPath));

  const trimmedNote = parsed.data.note.trim();
  const { error } = await supabase.rpc("create_report", {
    p_socialing_id: parsed.data.socialingId,
    p_reason: parsed.data.reason,
    ...(trimmedNote ? { p_note: trimmedNote } : {}),
  });
  if (error && error.message !== "ALREADY_REPORTED") {
    if (error.message === "NOT_AUTHENTICATED") redirect(withNext("/login", detailPath));
    console.error("create_report", error);
    return { ok: false, retry: true };
  }

  // 상세의 신고 줄이 "신고를 접수했어요"로 바뀐다
  revalidatePath(detailPath);
  return { ok: true };
}
