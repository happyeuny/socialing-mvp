import { type ApplicationStatus, type SocialingDetail, getSocialing } from "@/lib/queries/socialings";
import { createClient } from "@/lib/supabase/server";

// 소셜링 관리(P11, spec 8.8) 읽기. 뷰 my_hosted_socialings의 관리 칸과 hosted_socialing_applicants(architecture 3.2)를
// 그대로 쓴다. 버튼을 보일지·막을지와 이유는 DB가 계산한 값이고 화면에서 다시 계산하지 않는다.

/** 확정이 막힌 이유 */
export type ConfirmBlockedReason = "started";
/** 종료가 막힌 이유: 모집중·일시 전 / 모집중·일시 지남 / 확정·일시 전 */
export type CompleteBlockedReason = "confirm_first" | "not_confirmed" | "not_started";
/** 승인이 막힌 이유: 일시 지남 / 정원 참 */
export type ApproveBlockedReason = "started" | "full";

export type ManagedSocialing = Pick<
  SocialingDetail,
  | "id"
  | "title"
  | "status"
  | "status_tag"
  | "starts_at"
  | "venue_type"
  | "venue_name"
  | "join_type"
  | "capacity"
  | "staff_count"
  | "accepted_count"
> & {
  pending_count: number;
  closed_count: number;
  can_confirm: boolean;
  confirm_blocked_reason: ConfirmBlockedReason | null;
  can_complete: boolean;
  complete_blocked_reason: CompleteBlockedReason | null;
  can_cancel: boolean;
  can_edit: boolean;
  can_decide: boolean;
  can_approve: boolean;
  approve_blocked_reason: ApproveBlockedReason | null;
};

const MANAGED_COLUMNS =
  "id, title, status, status_tag, starts_at, venue_type, venue_name, join_type, capacity, staff_count, accepted_count, " +
  "pending_count, closed_count, can_confirm, confirm_blocked_reason, can_complete, complete_blocked_reason, " +
  "can_cancel, can_edit, can_decide, can_approve, approve_blocked_reason";

export type Applicant = {
  application_id: number;
  nickname: string;
  status: ApplicationStatus;
  applied_at: string;
};

export type ManagePageData =
  | { kind: "host"; socialing: ManagedSocialing; applicants: Applicant[] }
  /** 소셜링은 있지만 보는 사람이 호스트가 아님 → 상세 + "호스트만 볼 수 있어요" (spec 8.7) */
  | { kind: "not-host" }
  | { kind: "not-found" };

export async function getManagePageData(id: number): Promise<ManagePageData> {
  const supabase = await createClient();
  const [hosted, applicants] = await Promise.all([
    supabase.from("my_hosted_socialings").select(MANAGED_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("hosted_socialing_applicants")
      .select("application_id, nickname, status, applied_at")
      .eq("socialing_id", id)
      .order("applied_at", { ascending: true })
      .order("application_id", { ascending: true }),
  ]);
  if (hosted.error) throw new Error(`관리할 소셜링을 불러오지 못했습니다: ${hosted.error.message}`);
  if (applicants.error) throw new Error(`신청자를 불러오지 못했습니다: ${applicants.error.message}`);

  if (!hosted.data) {
    // 호스트인 소셜링에 없으면 남의 소셜링인지 없는 소셜링인지 나눈다
    return (await getSocialing(id)) ? { kind: "not-host" } : { kind: "not-found" };
  }
  // 뷰의 칸은 생성된 타입에서 null 가능으로 나오지만, 위 칸은 테이블의 not null 칸과 계산 값이다
  return {
    kind: "host",
    socialing: hosted.data as unknown as ManagedSocialing,
    applicants: applicants.data as unknown as Applicant[],
  };
}
