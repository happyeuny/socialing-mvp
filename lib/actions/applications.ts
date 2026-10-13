"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// 신청 O02 (spec M7, 8.4, 8.6). 버튼 하나 = 서버 액션 하나 = DB 함수 하나(apply_to_socialing).
// 신청할 수 있는지는 함수가 소셜링 행을 잠그고 다시 확인한다. 여기서는 함수의 오류 코드를 spec 문구로 바꾸기만 한다.

export type ApplyResult =
  /** 신청됨. 선착순은 accepted(참여 확정), 호스트 승인은 pending(승인 대기) */
  | { ok: true; status: "pending" | "accepted" }
  /** 누른 순간 신청할 수 없게 됨 → 결과 창에 이유, 확인하면 상세를 새로 고친다 */
  | { ok: false; reason: string }
  /** 네트워크·서버 오류 → 창을 연 채 다시 시도 */
  | { ok: false; retry: true };

// 함수 오류 코드 → 신청하지 못한 이유 (spec 8.4 "O02 실패")
const REASONS: Record<string, string> = {
  FULL: "방금 정원이 찼어요",
  DEADLINE_PASSED: "신청 마감 일시가 지났어요",
  // 종료 등: 종료는 소셜링 일시 뒤에만 되므로 신청 마감 일시도 지났다
  NOT_OPEN: "신청 마감 일시가 지났어요",
  HOST_CANCELED: "호스트가 취소한 소셜링이에요",
  ALREADY_APPLIED: "이미 신청한 소셜링이에요",
  IS_HOST: "내가 연 소셜링에는 신청할 수 없어요",
  INVALID_INPUT: "찾을 수 없는 소셜링이에요",
};

const socialingIdSchema = z.number().int().positive();

export async function applyToSocialing(socialingId: number): Promise<ApplyResult> {
  const parsed = socialingIdSchema.safeParse(socialingId);
  if (!parsed.success) return { ok: false, reason: REASONS.INVALID_INPUT };
  const id = parsed.data;
  const detailPath = `/socialings/${id}`;

  const supabase = await createClient();
  // 로그인이 끊겼으면 로그인 화면으로 보냈다가 상세로 돌아온다 (spec 8.6 권한 오류, screen-cases E13)
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", detailPath));

  const { data, error } = await supabase.rpc("apply_to_socialing", { p_socialing_id: id });
  if (error) {
    if (error.message === "NOT_AUTHENTICATED") redirect(withNext("/login", detailPath));
    const reason = REASONS[error.message];
    if (reason) return { ok: false, reason };
    console.error("apply_to_socialing", error);
    return { ok: false, retry: true };
  }

  // 아래 영역(7줄)과 인원, 내 소셜링 목록이 바뀐다
  revalidatePath(detailPath);
  revalidatePath("/me");
  return { ok: true, status: data.status === "accepted" ? "accepted" : "pending" };
}
