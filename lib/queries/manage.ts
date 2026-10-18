import { type ApplicationStatus, type SocialingDetail, getSocialing } from "@/lib/queries/socialings";
import { createClient } from "@/lib/supabase/server";
import type { RejectReason } from "@/lib/validation/reject";

// 소셜링 관리(P11, spec 8.8) 읽기. 뷰 my_hosted_socialings의 관리 칸과 hosted_socialing_applicants(architecture 3.2)를
// 그대로 쓴다. 버튼을 보일지·막을지와 이유는 DB가 계산한 값이고 화면에서 다시 계산하지 않는다.

/** 확정이 막힌 이유: 일시 지남 / 참여 확정 < 최소 인원 / 계산으로 취소·호스트 취소 (MS15 U4) */
export type ConfirmBlockedReason = "started" | "min_not_met" | "canceled";
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
  /** 호스트가 고른 거절 사유 (MS14 전에 거절했거나 거절이 아니면 null) */
  reject_reason: RejectReason | null;
};

export type ManagePageData =
  | {
      kind: "host";
      socialing: ManagedSocialing;
      applicants: Applicant[];
      /** 연령 조건이 있음 → 거절 사유에 "연령 조건과 맞지 않아요" (reject_application과 같은 기준) */
      hasAgeLimit: boolean;
    }
  /** 소셜링은 있지만 보는 사람이 호스트가 아님 → 상세 + "호스트만 볼 수 있어요" (spec 8.7) */
  | { kind: "not-host" }
  | { kind: "not-found" };

export async function getManagePageData(id: number): Promise<ManagePageData> {
  const supabase = await createClient();
  const [hosted, applicants, age] = await Promise.all([
    supabase.from("my_hosted_socialings").select(MANAGED_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("hosted_socialing_applicants")
      .select("application_id, nickname, status, applied_at, reject_reason")
      .eq("socialing_id", id)
      .order("applied_at", { ascending: true })
      .order("application_id", { ascending: true }),
    supabase.from("socialing_summaries").select("min_age, max_age").eq("id", id).maybeSingle(),
  ]);
  if (hosted.error) throw new Error(`관리할 소셜링을 불러오지 못했습니다: ${hosted.error.message}`);
  if (applicants.error) throw new Error(`신청자를 불러오지 못했습니다: ${applicants.error.message}`);
  if (age.error) throw new Error(`연령 조건을 불러오지 못했습니다: ${age.error.message}`);

  if (!hosted.data) {
    // 호스트인 소셜링에 없으면 남의 소셜링인지 없는 소셜링인지 나눈다
    return (await getSocialing(id)) ? { kind: "not-host" } : { kind: "not-found" };
  }
  // 뷰의 칸은 생성된 타입에서 null 가능으로 나오지만, 위 칸은 테이블의 not null 칸과 계산 값이다
  return {
    kind: "host",
    socialing: hosted.data as unknown as ManagedSocialing,
    applicants: applicants.data as unknown as Applicant[],
    hasAgeLimit: age.data?.min_age != null || age.data?.max_age != null,
  };
}

/** 소셜링 수정(P08) 양식에 채울 지금 값 (socialing_summaries) */
export type EditableSocialing = Pick<
  SocialingDetail,
  | "id"
  | "title"
  | "description"
  | "has_alcohol"
  | "venue_type"
  | "venue_name"
  | "region_sido"
  | "region_sigungu"
  | "starts_at"
  | "apply_deadline_at"
  | "fee"
  | "capacity"
  | "staff_count"
  | "join_type"
  | "approval_criteria"
  | "cover_photo_path"
> & {
  category_id: number;
  venue_id: number;
  /** MS14 2묶음 칸 (참가비 설명, 연령 조건, 자료 링크) */
  fee_note: string | null;
  min_age: number | null;
  max_age: number | null;
  material_url: string | null;
};

const EDITABLE_COLUMNS =
  "id, title, description, category_id, has_alcohol, venue_id, venue_type, venue_name, region_sido, region_sigungu, " +
  "starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, cover_photo_path, " +
  "fee_note, min_age, max_age, material_url";

export type EditPageData =
  | {
      kind: "host";
      socialing: EditableSocialing;
      /** 수정할 수 없으면 이유: 종료 / 호스트 취소 */
      closed: "completed" | "canceled" | null;
      /** 잠금 기준 (spec M8 수정): 참여 확정이 있으면 일시·장소·참가비(설명은 이미 썼을 때), 승인 대기가 있으면 모집 방식 */
      acceptedCount: number;
      pendingCount: number;
    }
  | { kind: "not-host" }
  | { kind: "not-found" };

export async function getEditPageData(id: number): Promise<EditPageData> {
  const supabase = await createClient();
  const [hosted, socialing] = await Promise.all([
    supabase
      .from("my_hosted_socialings")
      .select("status, can_edit, accepted_count, pending_count")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("socialing_summaries").select(EDITABLE_COLUMNS).eq("id", id).maybeSingle(),
  ]);
  if (hosted.error) throw new Error(`수정할 소셜링을 불러오지 못했습니다: ${hosted.error.message}`);
  if (socialing.error) throw new Error(`소셜링을 불러오지 못했습니다: ${socialing.error.message}`);

  if (!socialing.data) return { kind: "not-found" };
  if (!hosted.data) return { kind: "not-host" };
  const { status, can_edit, accepted_count, pending_count } = hosted.data;
  return {
    kind: "host",
    // 뷰의 칸은 생성된 타입에서 null 가능으로 나오지만, 위 칸은 테이블의 not null 칸이다
    socialing: socialing.data as unknown as EditableSocialing,
    closed: can_edit ? null : status === "completed" ? "completed" : "canceled",
    acceptedCount: accepted_count ?? 0,
    pendingCount: pending_count ?? 0,
  };
}
