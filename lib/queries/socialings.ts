import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// 목록·상세 읽기. 모두 뷰 socialing_summaries 하나를 읽는다(architecture 3.2).
// 신청 가능·꼬리표·신청 불가 이유는 뷰가 계산한 값을 그대로 쓰고, 화면에서 다시 계산하지 않는다.

type Enums = Database["public"]["Enums"];
export type SocialingStatus = Enums["socialing_status"];
export type StatusTag = "closed" | "full";

/** 카드(spec 8.5)에 필요한 칸 */
export type SocialingCardData = {
  id: number;
  title: string;
  host_nickname: string;
  category_slug: string;
  category_name: string;
  has_alcohol: boolean;
  venue_type: Enums["venue_type"];
  venue_name: string;
  region_sigungu: string;
  starts_at: string;
  fee: number;
  capacity: number;
  accepted_count: number;
  cover_photo_path: string | null;
  status: SocialingStatus;
  status_tag: StatusTag | null;
};

const CARD_COLUMNS =
  "id, title, host_nickname, category_slug, category_name, has_alcohol, venue_type, venue_name, region_sigungu, starts_at, fee, capacity, accepted_count, cover_photo_path, status, status_tag";

// 현재/지난은 상태가 아니라 소셜링 일시로 나눈다(spec 3.1). 상태는 그대로 보인다.
async function listByPast(past: boolean): Promise<SocialingCardData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("socialing_summaries")
    .select(CARD_COLUMNS)
    .eq("is_past", past)
    .order("starts_at", { ascending: !past })
    .order("id", { ascending: !past });
  if (error) throw new Error(`소셜링 목록을 불러오지 못했습니다: ${error.message}`);
  // 뷰의 칸은 생성된 타입에서 모두 null 가능으로 나오지만, 위 칸은 테이블의 not null 칸과 계산 값이라 null이 아니다.
  return data as SocialingCardData[];
}

/** 탐색(P01): 소셜링 일시가 지나지 않은 소셜링, 가까운 일시 순 */
export function listCurrentSocialings(): Promise<SocialingCardData[]> {
  return listByPast(false);
}

/** 지난 소셜링(P02): 소셜링 일시가 지난 소셜링, 최근 순 */
export function listPastSocialings(): Promise<SocialingCardData[]> {
  return listByPast(true);
}

export type ClosedReason = "host_canceled" | "started" | "not_open" | "deadline" | "full";

/** 상세(P03, spec M4)에 필요한 칸 */
export type SocialingDetail = SocialingCardData & {
  description: string;
  host_id: string;
  region_sido: string;
  apply_deadline_at: string;
  staff_count: number;
  join_type: Enums["join_type"];
  approval_criteria: string | null;
  is_past: boolean;
  can_apply: boolean;
  closed_reason: ClosedReason | null;
};

const DETAIL_COLUMNS = `${CARD_COLUMNS}, description, host_id, region_sido, apply_deadline_at, staff_count, join_type, approval_criteria, is_past, can_apply, closed_reason`;

/** 상세 하나. 없는 번호면 null. 화면과 제목(metadata)이 같이 부르므로 요청 안에서 한 번만 읽는다 */
export const getSocialing = cache(async (id: number): Promise<SocialingDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("socialing_summaries").select(DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`소셜링을 불러오지 못했습니다: ${error.message}`);
  return data as SocialingDetail | null;
});

/** 대표 사진 주소 (Storage `socialing-photos`는 공개 읽기) */
export function socialingPhotoUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/socialing-photos/${path}`;
}
