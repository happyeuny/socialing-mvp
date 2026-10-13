import { createClient } from "@/lib/supabase/server";

// 인증 후기 읽기. 작성자는 닉네임으로만 보인다(spec P10). 비공개 확인 질문(review_checks)은 여기서 읽지 않는다.

export type ReviewSummary = {
  id: number;
  body: string;
  created_at: string;
  socialing_id: number;
  socialing_title: string;
  author_nickname: string;
};

/** 최근 인증 후기 (최신순) */
export async function listRecentReviews(limit: number): Promise<ReviewSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, body, created_at, socialing_id, socialings(title), profiles(nickname)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`후기를 불러오지 못했습니다: ${error.message}`);
  return data.map((review) => ({
    id: review.id,
    body: review.body,
    created_at: review.created_at,
    socialing_id: review.socialing_id,
    socialing_title: review.socialings.title,
    author_nickname: review.profiles.nickname,
  }));
}
