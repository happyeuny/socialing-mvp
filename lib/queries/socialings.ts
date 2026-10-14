import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// 목록·상세 읽기. 모두 뷰 socialing_summaries 하나를 읽는다(architecture 3.2).
// 신청 가능·꼬리표·신청 불가 이유는 뷰가 계산한 값을 그대로 쓰고, 화면에서 다시 계산하지 않는다.

type Enums = Database["public"]["Enums"];
export type SocialingStatus = Enums["socialing_status"];
export type ApplicationStatus = Enums["application_status"];
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

export const CARD_COLUMNS =
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

/** 탐색(P01) 카드 + 필터로 거르는 칸 (lib/explore-filter.ts) */
export type ExploreSocialing = SocialingCardData & {
  venue_id: number;
  category_is_party: boolean;
  region_sido: string;
};

/**
 * 탐색(P01): 소셜링 일시가 지나지 않은 소셜링 전부, 가까운 일시 순. 필터는 화면이 lib/explore-filter.ts로 거른다
 * (필터 시트의 "소셜링 N개 보기"와 같은 함수로 거르려고. 현재 소셜링은 수십 개라 한 번에 읽는다)
 */
export async function listExploreSocialings(): Promise<ExploreSocialing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("socialing_summaries")
    .select(`${CARD_COLUMNS}, venue_id, category_is_party, region_sido`)
    .eq("is_past", false)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`소셜링 목록을 불러오지 못했습니다: ${error.message}`);
  return data as ExploreSocialing[];
}

/** 지난 소셜링(P02): 소셜링 일시가 지난 소셜링, 최근 순 */
export function listPastSocialings(): Promise<SocialingCardData[]> {
  return listByPast(true);
}

/**
 * 홈(P00, spec 8.2): 히어로 = 지금 신청할 수 있는 소셜링 중 일시가 가장 가까운 1개(없으면 null),
 * 곧 열리는 소셜링 = 일시가 지나지 않은 소셜링 가까운 순 3개(히어로와 호스트 취소는 뺌). 운영자가 고르거나 유료로 올리는 자리는 없다.
 * 홈의 두 묶음이 따로 부르므로 요청 안에서 한 번만 읽는다.
 */
export const getHomeSocialings = cache(async (): Promise<{
  hero: SocialingCardData | null;
  upcoming: SocialingCardData[];
}> => {
  const supabase = await createClient();
  const heroResult = await supabase
    .from("socialing_summaries")
    .select(CARD_COLUMNS)
    .eq("can_apply", true)
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (heroResult.error) throw new Error(`히어로 소셜링을 불러오지 못했습니다: ${heroResult.error.message}`);
  const hero = heroResult.data as SocialingCardData | null;

  let upcomingQuery = supabase
    .from("socialing_summaries")
    .select(CARD_COLUMNS)
    .eq("is_past", false)
    .neq("status", "canceled")
    .order("starts_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(3);
  if (hero) upcomingQuery = upcomingQuery.neq("id", hero.id);
  const upcomingResult = await upcomingQuery;
  if (upcomingResult.error) throw new Error(`곧 열리는 소셜링을 불러오지 못했습니다: ${upcomingResult.error.message}`);
  return { hero, upcoming: upcomingResult.data as SocialingCardData[] };
});

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
