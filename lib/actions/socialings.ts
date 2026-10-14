"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

// 소셜링 등록(P07)의 "소셜링 열기" (spec M8, 8.6, 8.7). 버튼 하나 = 서버 액션 하나 = DB 함수 하나(create_socialing).
// 입력은 폼과 같은 규칙으로 한 번 더 보고, 함수가 다시 확인한다. 여기서는 결과를 화면 동작으로 바꾸기만 한다.

export type SaveSocialingResult =
  | { ok: true; id: number }
  /** 칸 오류 (칸 아래 이유, 첫 오류 칸으로 이동) */
  | { ok: false; fieldErrors: SocialingFieldErrors }
  /** 네트워크·서버 오류, 받을 수 없는 입력 → 입력을 그대로 두고 다시 시도 */
  | { ok: false; retry: true };

const NEW_PATH = "/socialings/new";

type CreateArgs = Database["public"]["Functions"]["create_socialing"]["Args"];

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

  // 생성된 타입은 null을 받지 않는다고 나오지만, 함수는 장소 갈래·승인 기준·사진이 없으면 null로 받는다
  const args = socialingArgs(parsed.data, coverPhotoPath) as unknown as CreateArgs;
  const { data, error } = await supabase.rpc("create_socialing", args);
  if (error || !data) {
    if (error?.message === "NOT_AUTHENTICATED") redirect(withNext("/login", NEW_PATH));
    console.error("create_socialing", error);
    return { ok: false, retry: true };
  }

  // 새 소셜링은 홈·탐색 목록, 상세, 내 소셜링 "호스트인 소셜링"에 보인다
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}
