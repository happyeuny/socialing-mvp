import { createClient } from "@/lib/supabase/server";

// 호스트 기록 (spec M5·6장, architecture 3.2). 집계 함수 get_host_record가 합계만 돌려준다.
// 상세(P03)는 이 값을 소셜링 본문과 따로 읽어서, 실패해도 그 칸만 다시 시도하게 한다(Q3).

export type HostRecord = {
  openedCount: number;
  canceledCount: number;
  reviewCount: number;
  responseCount: number;
  /** 소개 일치 비율 0~1 (반올림 안 함). 응답 5건 미만이면 null */
  matchRate: number | null;
  isNewHost: boolean;
};

export async function getHostRecord(hostId: string): Promise<HostRecord> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_host_record", { p_host_id: hostId }).single();
  if (error) throw new Error(`호스트 기록을 불러오지 못했습니다: ${error.message}`);
  return {
    openedCount: data.opened_count,
    canceledCount: data.canceled_count,
    reviewCount: data.review_count,
    responseCount: data.response_count,
    // 생성된 타입은 null을 빼고 나오지만 응답 5건 미만이면 null이다
    matchRate: data.match_rate ?? null,
    isNewHost: data.is_new_host,
  };
}
