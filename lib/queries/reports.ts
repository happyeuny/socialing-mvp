import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/queries/viewer";

/**
 * 지금 보는 사람이 이 소셜링을 신고했는지 (SH4b, P03 신고 줄). 비로그인이면 false.
 * reports는 RLS로 본인 행만 읽힌다. 못 읽어도 상세와 신청은 그대로 두려고 부르는 쪽이 실패를 false로 받는다 (Q3).
 */
export async function hasReported(socialingId: number): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.from("reports").select("id").eq("socialing_id", socialingId).maybeSingle();
  if (error) throw new Error(`신고 여부를 불러오지 못했습니다: ${error.message}`);
  return data !== null;
}
