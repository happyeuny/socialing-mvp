"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { NoticeKey } from "@/lib/notices";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, type ReviewInput } from "@/lib/validation/review";

// 후기 쓰기 P09의 "후기 올리기" (spec M9, 8.6, 8.7). 버튼 하나 = 서버 액션 하나 = DB 함수 하나(create_review).
// 작성 조건(참여 확정자 · 종료 · 아직 안 씀)과 입력은 함수가 다시 확인한다. 여기서는 오류 코드를 화면 동작으로 바꾸기만 한다.

export type CreateReviewResult =
  | { ok: true }
  /** 쓰는 사이 작성 조건이 안 맞게 됨 → 상세로 보내고 이유를 짧은 안내로 (들어올 때와 같은 문구) */
  | { ok: false; notice: NoticeKey }
  /** 네트워크·서버 오류, 받을 수 없는 입력 → 글을 그대로 두고 다시 시도 */
  | { ok: false; retry: true };

// 함수 오류 코드 → 상세에 띄울 이유 (spec 8.7)
const NOTICE_OF: Record<string, NoticeKey> = {
  NOT_ELIGIBLE: "review-not-participant",
  INVALID_STATE: "review-not-completed",
  ALREADY_REVIEWED: "review-done",
};

export async function createReview(input: ReviewInput): Promise<CreateReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, retry: true };
  const { socialingId, body, photoPath, membersMatch, extraMoney, contentMatch } = parsed.data;
  const reviewPath = `/socialings/${socialingId}/review`;

  const supabase = await createClient();
  // 로그인이 끊겼으면 로그인 화면으로 보냈다가 후기 쓰기로 돌아온다. 글은 브라우저에 임시 저장돼 있다 (spec 8.7)
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", reviewPath));

  const { error } = await supabase.rpc("create_review", {
    p_socialing_id: socialingId,
    p_body: body,
    // 생성된 타입은 null을 받지 않는다고 나오지만, 함수는 사진 없음을 null로 받는다
    p_photo_path: photoPath as string,
    p_members_match: membersMatch,
    p_extra_money: extraMoney,
    p_content_match: contentMatch,
  });
  if (error) {
    if (error.message === "NOT_AUTHENTICATED") redirect(withNext("/login", reviewPath));
    const notice = NOTICE_OF[error.message];
    if (notice) return { ok: false, notice };
    console.error("create_review", error);
    return { ok: false, retry: true };
  }

  // 새 후기는 인증 후기(P10) 맨 위, 홈 "최근 인증 후기", 상세 아래 영역("후기 작성 완료"), 내 소셜링("후기 쓰기" 버튼)에 보인다
  revalidatePath("/", "layout");
  return { ok: true };
}
