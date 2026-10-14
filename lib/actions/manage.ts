"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withNotice } from "@/lib/notices";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// 소셜링 관리 P11의 호스트 버튼 (spec M8, 8.8). 버튼 하나 = 서버 액션 하나 = DB 함수 하나.
// 호스트 본인인지, 지금 누를 수 있는지는 함수가 소셜링 행을 잠그고 다시 확인한다(architecture 5장).
// 여기서는 함수의 오류 코드를 화면 문구로 바꾸기만 한다.

export type ManageActionResult =
  | { ok: true }
  /** 누른 순간 처리할 수 없게 됨 → 결과 창에 이유, 확인하면 관리 화면을 새로 고친다 */
  | { ok: false; reason: string }
  /** 네트워크·서버 오류 → 다시 시도 */
  | { ok: false; retry: true };

const decideSchema = z.object({
  socialingId: z.number().int().positive(),
  applicationId: z.number().int().positive(),
  approve: z.boolean(),
});

// decide_application 오류 코드 → 승인·거절하지 못한 이유 (spec 8.8, screen-cases P11-12~14)
function decideReason(code: string, approve: boolean): string | undefined {
  switch (code) {
    case "FULL":
      return "정원이 차서 승인할 수 없어요";
    case "STARTED":
      return approve ? "소셜링 일시가 지나 승인할 수 없어요" : "소셜링 일시가 지나 거절할 수 없어요";
    // 그 사이 신청자가 신청을 취소했거나 다른 화면에서 이미 처리함
    case "ALREADY_PROCESSED":
    case "INVALID_INPUT":
      return "이미 처리된 신청이에요";
    // 그 사이 종료·호스트 취소됨
    case "INVALID_STATE":
      return "이미 처리된 소셜링이에요";
  }
}

/** 승인 대기 신청을 승인(참여 확정)하거나 거절한다 */
export async function decideApplication(
  socialingId: number,
  applicationId: number,
  approve: boolean,
): Promise<ManageActionResult> {
  const parsed = decideSchema.safeParse({ socialingId, applicationId, approve });
  if (!parsed.success) return { ok: false, reason: "이미 처리된 신청이에요" };
  const managePath = `/socialings/${parsed.data.socialingId}/manage`;
  const detailPath = `/socialings/${parsed.data.socialingId}`;

  const supabase = await createClient();
  // 로그인이 끊겼으면 로그인 화면으로 보냈다가 관리 화면으로 돌아온다 (spec 8.6 권한 오류)
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", managePath));

  const { error } = await supabase.rpc("decide_application", {
    p_application_id: parsed.data.applicationId,
    p_approve: parsed.data.approve,
  });
  if (error) {
    if (error.message === "NOT_AUTHENTICATED") redirect(withNext("/login", managePath));
    if (error.message === "NOT_HOST") redirect(withNotice(detailPath, "host-only"));
    const reason = decideReason(error.message, parsed.data.approve);
    if (reason) return { ok: false, reason };
    console.error("decide_application", error);
    return { ok: false, retry: true };
  }

  // 관리 화면의 탭·건수·요약, 상세의 인원·아래 영역, 내 소셜링 목록이 바뀐다
  revalidatePath(managePath);
  revalidatePath(detailPath);
  revalidatePath("/me");
  return { ok: true };
}

// 상태 버튼 확정 · 종료 · 호스트 취소 (spec 8.8, screen-cases P11-01~06·18~20). 셋 다 O04를 거친 뒤 부른다.

const socialingIdSchema = z.number().int().positive();

// 함수 오류 코드 → 처리하지 못한 이유. 버튼은 뷰가 누를 수 있다고 한 때만 열리므로,
// 여기 오는 것은 화면을 연 사이 일시가 지났거나 다른 화면에서 이미 처리한 경우다.
const STATUS_REASONS: Record<string, string> = {
  STARTED: "소셜링 일시가 지나 확정할 수 없어요",
  NOT_STARTED: "소셜링 일시가 지나야 종료할 수 있어요",
  INVALID_STATE: "이미 처리된 소셜링이에요",
  INVALID_INPUT: "이미 처리된 소셜링이에요",
};

async function changeSocialingStatus(
  fn: "confirm_socialing" | "complete_socialing" | "cancel_socialing",
  socialingId: number,
): Promise<ManageActionResult> {
  const parsed = socialingIdSchema.safeParse(socialingId);
  if (!parsed.success) return { ok: false, reason: STATUS_REASONS.INVALID_INPUT };
  const managePath = `/socialings/${parsed.data}/manage`;
  const detailPath = `/socialings/${parsed.data}`;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", managePath));

  const { error } = await supabase.rpc(fn, { p_socialing_id: parsed.data });
  if (error) {
    if (error.message === "NOT_AUTHENTICATED") redirect(withNext("/login", managePath));
    if (error.message === "NOT_HOST") redirect(withNotice(detailPath, "host-only"));
    const reason = STATUS_REASONS[error.message];
    if (reason) return { ok: false, reason };
    console.error(fn, error);
    return { ok: false, retry: true };
  }

  // 상태 배지는 관리·상세뿐 아니라 홈·탐색·지난 소셜링·내 소셜링 목록에도 보인다
  revalidatePath("/", "layout");
  return { ok: true };
}

/** 확정: 모집중, 소셜링 일시 전 */
export async function confirmSocialing(socialingId: number): Promise<ManageActionResult> {
  return changeSocialingStatus("confirm_socialing", socialingId);
}

/** 종료: 확정, 소셜링 일시 뒤. 종료하면 참여 확정자가 인증 후기를 쓸 수 있다 */
export async function completeSocialing(socialingId: number): Promise<ManageActionResult> {
  return changeSocialingStatus("complete_socialing", socialingId);
}

/** 호스트 취소: 종료·호스트 취소 전. 신청 상태는 그대로 둔다(spec 3.3) */
export async function cancelSocialing(socialingId: number): Promise<ManageActionResult> {
  return changeSocialingStatus("cancel_socialing", socialingId);
}
