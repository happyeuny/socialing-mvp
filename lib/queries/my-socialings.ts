import type { ApplicationStatus } from "@/lib/queries/socialings";
import { getViewer } from "@/lib/queries/viewer";
import { createClient } from "@/lib/supabase/server";

// "나" 기준 읽기. 뷰 my_hosted_socialings · my_applied_socialings(architecture 3.2)가 보는 사람 권한으로 계산한 값을 그대로 쓴다.

/** 상세 아래 영역(spec 8.4)이 줄을 고르는 데 필요한 보는 사람 정보 */
export type ApplyBarViewer =
  | { kind: "anonymous" }
  /** 호스트 본인. pendingCount = 승인 대기 건수 */
  | { kind: "host"; pendingCount: number }
  /** 로그인한 다른 사람. application = 이 소셜링에 한 가장 최근 신청(없으면 null) */
  | { kind: "member"; application: { id: number; status: ApplicationStatus; hasReview: boolean } | null };

export async function getApplyBarViewer(socialingId: number): Promise<ApplyBarViewer> {
  const viewer = await getViewer();
  if (!viewer) return { kind: "anonymous" };

  const supabase = await createClient();
  const [hosted, applied] = await Promise.all([
    supabase.from("my_hosted_socialings").select("pending_count").eq("id", socialingId).maybeSingle(),
    supabase
      .from("my_applied_socialings")
      .select("application_id, application_status, has_review")
      .eq("id", socialingId)
      .maybeSingle(),
  ]);
  if (hosted.error) throw new Error(`호스트 정보를 불러오지 못했습니다: ${hosted.error.message}`);
  if (applied.error) throw new Error(`내 신청을 불러오지 못했습니다: ${applied.error.message}`);

  if (hosted.data) return { kind: "host", pendingCount: hosted.data.pending_count ?? 0 };
  const row = applied.data;
  // 뷰의 칸은 생성된 타입에서 null 가능으로 나오지만, 행이 있으면 신청 칸은 not null이다
  if (!row?.application_id || !row.application_status) return { kind: "member", application: null };
  return {
    kind: "member",
    application: { id: row.application_id, status: row.application_status, hasReview: row.has_review ?? false },
  };
}
