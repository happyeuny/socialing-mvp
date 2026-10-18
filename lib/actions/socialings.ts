"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toSeoulInput } from "@/lib/format";
import { withNotice } from "@/lib/notices";
import { withNext } from "@/lib/routes";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  COVER_PHOTO_PATH,
  fieldErrorsOf,
  socialingArgs,
  socialingFormSchema,
  type SocialingFieldErrors,
  type SocialingFormValues,
} from "@/lib/validation/socialing";

// 소셜링 등록(P07)의 "소셜링 열기"와 수정(P08)의 "저장하기" (spec M8, 8.6, 8.7).
// 버튼 하나 = 서버 액션 하나 = DB 함수 하나(create_socialing_v3 · update_socialing_v3, MS15에서 최소 인원·확정 기한을 더한 이름).
// 입력은 폼과 같은 규칙으로 한 번 더 보고, 함수가 다시 확인한다(잠금·정원 하한·권한·상태). 여기서는 결과를 화면 동작으로 바꾸기만 한다.

export type SaveSocialingResult =
  | { ok: true; id: number }
  /** 칸 오류 (칸 아래 이유, 첫 오류 칸으로 이동) */
  | { ok: false; fieldErrors: SocialingFieldErrors }
  /** 네트워크·서버 오류, 받을 수 없는 입력 → 입력을 그대로 두고 다시 시도 */
  | { ok: false; retry: true };

const NEW_PATH = "/socialings/new";

type CreateArgs = Database["public"]["Functions"]["create_socialing_v3"]["Args"];
type UpdateArgs = Database["public"]["Functions"]["update_socialing_v3"]["Args"];

export async function createSocialing(
  values: SocialingFormValues,
  coverPhotoPath: string | null,
): Promise<SaveSocialingResult> {
  const parsed = socialingFormSchema({ now: Date.now() }).safeParse(values);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: false, retry: true };
  }
  if (coverPhotoPath !== null && !COVER_PHOTO_PATH.test(coverPhotoPath)) return { ok: false, retry: true };

  const supabase = await createClient();
  // 로그인이 끊겼으면 로그인 화면으로 보냈다가 등록으로 돌아온다. 글은 브라우저에 임시 저장돼 있다 (spec 8.7)
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", NEW_PATH));

  // 생성된 타입은 null을 받지 않는다고 나오지만, 함수는 장소 갈래·승인 기준·사진·새 칸이 없으면 null로 받는다
  const args = socialingArgs(parsed.data, coverPhotoPath) as unknown as CreateArgs;
  const { data, error } = await supabase.rpc("create_socialing_v3", args);
  if (error || !data) {
    if (error?.message === "NOT_AUTHENTICATED") redirect(withNext("/login", NEW_PATH));
    console.error("create_socialing_v3", error);
    return { ok: false, retry: true };
  }

  // 새 소셜링은 홈·탐색 목록, 상세, 내 소셜링 "호스트인 소셜링"에 보인다
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export type UpdateSocialingResult =
  | { ok: true }
  | { ok: false; fieldErrors: SocialingFieldErrors }
  | { ok: false; retry: true }
  /** 그사이 참여 확정·승인 대기가 생겨 잠긴 칸을 바꿨거나 정원이 참여 확정 인원보다 적어짐 → 결과 창 + 새로 고침 */
  | { ok: false; conflict: true };

export async function updateSocialing(
  socialingId: number,
  values: SocialingFormValues,
  coverPhotoPath: string | null,
): Promise<UpdateSocialingResult> {
  if (!Number.isSafeInteger(socialingId) || socialingId <= 0) return { ok: false, retry: true };
  const editPath = `/socialings/${socialingId}/edit`;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(withNext("/login", editPath));

  // 소셜링 일시는 바꿀 때만 지금 이후인지, 세 일시는 하나라도 바꿀 때만 확정 기한 순서·12시간을 본다.
  // 사진은 바꿀 때만 경로 모양을 본다. 지금 값은 DB에서 읽는다(잠금·정원 하한은 함수가 본다)
  const { data: current, error: readError } = await supabase
    .from("socialing_summaries")
    .select("starts_at, apply_deadline_at, confirm_deadline_at, min_participants, cover_photo_path")
    .eq("id", socialingId)
    .maybeSingle();
  if (readError || !current?.starts_at || !current.apply_deadline_at || !current.confirm_deadline_at) {
    return { ok: false, retry: true };
  }

  const parsed = socialingFormSchema({
    now: Date.now(),
    original: {
      startsAt: toSeoulInput(current.starts_at),
      applyDeadlineAt: toSeoulInput(current.apply_deadline_at),
      confirmDeadlineAt: toSeoulInput(current.confirm_deadline_at),
      minParticipants: String(current.min_participants ?? ""),
    },
  }).safeParse(values);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: false, retry: true };
  }
  const photoChanged = coverPhotoPath !== current.cover_photo_path;
  if (photoChanged && coverPhotoPath !== null && !COVER_PHOTO_PATH.test(coverPhotoPath)) return { ok: false, retry: true };

  const args = { p_socialing_id: socialingId, ...socialingArgs(parsed.data, coverPhotoPath) } as unknown as UpdateArgs;
  const { error } = await supabase.rpc("update_socialing_v3", args);
  if (error) {
    switch (error.message) {
      case "NOT_AUTHENTICATED":
        redirect(withNext("/login", editPath));
      case "NOT_HOST":
        redirect(withNotice(`/socialings/${socialingId}`, "host-only"));
      case "INVALID_STATE": {
        // 그사이 종료·호스트 취소됨 → 관리 + 이유 (spec 8.7, screen-cases E06)
        const { data: after } = await supabase.from("socialing_summaries").select("status").eq("id", socialingId).maybeSingle();
        const notice = after?.status === "completed" ? "edit-completed" : "edit-canceled";
        redirect(withNotice(`/socialings/${socialingId}/manage`, notice));
      }
      case "AUTO_CANCELED":
        // 그사이 신청 마감·확정 기한이 지나 계산으로 취소됨 (MS15 U4, 04 2.5)
        redirect(withNotice(`/socialings/${socialingId}/manage`, "edit-auto-canceled"));
      case "LOCKED_FIELD":
      case "BELOW_ACCEPTED":
        return { ok: false, conflict: true };
      default:
        console.error("update_socialing_v3", error);
        return { ok: false, retry: true };
    }
  }

  // 바뀐 값은 상세, 관리, 목록 카드, 내 소셜링에 보인다
  revalidatePath("/", "layout");
  return { ok: true };
}
