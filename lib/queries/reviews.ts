import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";

// 인증 후기 읽기. 작성자는 닉네임으로만 보인다(spec P10). 비공개 확인 질문(review_checks)은 여기서 읽지 않는다.

export type ReviewSummary = {
  id: number;
  body: string;
  photo_path: string | null;
  created_at: string;
  socialing_id: number;
  socialing_title: string;
  author_nickname: string;
};

/** 인증 후기 화면(P10)에 보이는 최대 개수. 더 불러오기는 없다 (데모 데이터는 수십 개) */
export const REVIEW_FEED_LIMIT = 50;

/** 인증 후기 최신순. 홈 "최근 인증 후기"(2개)와 인증 후기 화면(P10)이 같이 쓴다 */
export async function listRecentReviews(limit: number): Promise<ReviewSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, body, photo_path, created_at, socialing_id, socialings(title), profiles(nickname)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`후기를 불러오지 못했습니다: ${error.message}`);
  return data.map((review) => ({
    id: review.id,
    body: review.body,
    photo_path: review.photo_path,
    created_at: review.created_at,
    socialing_id: review.socialing_id,
    socialing_title: review.socialings.title,
    author_nickname: review.profiles.nickname,
  }));
}

/** 후기 사진의 공개 주소 (Storage `review-photos`는 공개 읽기) */
export function reviewPhotoUrl(path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/review-photos/${path}`;
}
