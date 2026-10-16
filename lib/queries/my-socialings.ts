import { CARD_COLUMNS, type ApplicationStatus, type SocialingCardData } from "@/lib/queries/socialings";
import { getViewer } from "@/lib/queries/viewer";
import { createClient } from "@/lib/supabase/server";
import type { RejectReason } from "@/lib/validation/reject";

// "나" 기준 읽기. 뷰 my_hosted_socialings · my_applied_socialings(architecture 3.2)가 보는 사람 권한으로 계산한 값을 그대로 쓴다.

/** 상세 아래 영역(spec 8.4)이 줄을 고르는 데 필요한 보는 사람 정보 */
export type ApplyBarViewer =
  | { kind: "anonymous" }
  /** 호스트 본인. pendingCount = 승인 대기 건수 */
  | { kind: "host"; pendingCount: number }
  /** 로그인한 다른 사람. application = 이 소셜링에 한 가장 최근 신청(없으면 null) */
  | { kind: "member"; application: ViewerApplication | null };

/** 보는 사람의 가장 최근 신청. 거절이면 호스트가 고른 사유와 덧붙인 말(MS14 전 거절은 null) */
export type ViewerApplication = {
  id: number;
  status: ApplicationStatus;
  hasReview: boolean;
  rejectReason: RejectReason | null;
  rejectNote: string | null;
};

export async function getApplyBarViewer(socialingId: number): Promise<ApplyBarViewer> {
  const viewer = await getViewer();
  if (!viewer) return { kind: "anonymous" };

  const supabase = await createClient();
  const [hosted, applied] = await Promise.all([
    supabase.from("my_hosted_socialings").select("pending_count").eq("id", socialingId).maybeSingle(),
    supabase
      .from("my_applied_socialings")
      .select("application_id, application_status, has_review, reject_reason, reject_note")
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
    application: {
      id: row.application_id,
      status: row.application_status,
      hasReview: row.has_review ?? false,
      rejectReason: row.reject_reason,
      rejectNote: row.reject_note,
    },
  };
}

/** 내 소셜링(P06) 신청한 소셜링 탭의 카드: 소셜링마다 내 가장 최근 신청 하나 */
export type MyAppliedSocialing = SocialingCardData & {
  is_past: boolean;
  application_status: ApplicationStatus;
  has_review: boolean;
  /** 거절 사유 (덧붙인 말은 상세에서만) */
  reject_reason: RejectReason | null;
};

/** 내 소셜링(P06) 호스트인 소셜링 탭의 카드 */
export type MyHostedSocialing = SocialingCardData & { is_past: boolean; pending_count: number };

/** 다가오는 소셜링(가까운 일시 순)과 지난 소셜링(최근 순)으로 나눈다 (spec M11). 지난 것은 뷰의 is_past */
export type SplitByPast<T> = { upcoming: T[]; past: T[] };

function splitByPast<T extends { is_past: boolean }>(rows: T[]): SplitByPast<T> {
  // rows는 소셜링 일시가 이른 순으로 온다
  return { upcoming: rows.filter((row) => !row.is_past), past: rows.filter((row) => row.is_past).reverse() };
}

export async function listMyAppliedSocialings(): Promise<SplitByPast<MyAppliedSocialing>> {
  const supabase = await createClient();
  // 내가 신청 취소한 소셜링은 목록에서 뺀다(spec M11). 다시 신청하면 가장 최근 신청이 새 행이라 다시 보인다.
  // 호스트 취소는 신청 상태를 바꾸지 않으므로(spec 3.3) 여기 걸리지 않고 "호스트 취소"로 남는다
  const { data, error } = await supabase
    .from("my_applied_socialings")
    .select(`${CARD_COLUMNS}, is_past, application_status, has_review, reject_reason`)
    .neq("application_status", "canceled")
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`신청한 소셜링을 불러오지 못했습니다: ${error.message}`);
  // 뷰의 칸은 생성된 타입에서 null 가능으로 나오지만, 위 칸은 테이블의 not null 칸과 계산 값이다
  return splitByPast(data as unknown as MyAppliedSocialing[]);
}

export async function listMyHostedSocialings(): Promise<SplitByPast<MyHostedSocialing>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("my_hosted_socialings")
    .select(`${CARD_COLUMNS}, is_past, pending_count`)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`호스트인 소셜링을 불러오지 못했습니다: ${error.message}`);
  return splitByPast(data as unknown as MyHostedSocialing[]);
}
