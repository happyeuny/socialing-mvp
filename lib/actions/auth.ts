"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { createClient } from "@/lib/supabase/server";
import { authMessages, fieldErrorsOf, loginSchema, signupSchema, type AuthField } from "@/lib/validation/auth";

// 로그인 P04 · 가입 P05 · 로그아웃 (spec M6, 8.6, 8.7). 성공하면 next 주소로 보낸다.
// 가입은 "환영해요, ○○님" 안내를 띄워야 해서 서버에서 보내지 않고 결과(signedUp)를 돌려주면 폼이 안내를 띄우고 옮긴다.
// 화면 상태 흉내: 폼이 `_state=error`를 함께 보내면(주소에 `?_state=error`) 서버 실패 문구를 돌려준다 (운영 주소에서는 무시).

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  formError?: string;
  /** "이미 가입된 이메일이에요 · 로그인하기"의 로그인하기 링크를 보일지 */
  emailTaken?: boolean;
  /** 가입 성공. 폼이 "환영해요, ○○님"을 띄우고 next 주소로 간다 */
  signedUp?: { nickname: string };
};

export async function login(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  if (simulatesServerError(formData)) return { formError: authMessages.loginFailed };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // 400 invalid_credentials: 어느 쪽이 틀렸는지 밝히지 않는다
    if (error.status === 400) return { formError: authMessages.wrongCredentials };
    return { formError: authMessages.loginFailed };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

export async function signup(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const { email, password, nickname } = parsed.data;
  if (simulatesServerError(formData)) return { formError: authMessages.signupFailed };

  const supabase = await createClient();
  const taken = await isNicknameTaken(supabase, nickname);
  if (taken === null) return { formError: authMessages.signupFailed };
  if (taken) return { fieldErrors: { nickname: authMessages.nicknameTaken } };

  // 닉네임은 가입 트리거(handle_new_user)가 profiles에 넣는다. Confirm email이 꺼져 있어 바로 로그인된다.
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { fieldErrors: { email: authMessages.emailTaken }, emailTaken: true };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: authMessages.passwordMin } };
    if (error.code === "email_address_invalid") return { fieldErrors: { email: authMessages.emailFormat } };
    // 확인과 가입 사이에 같은 닉네임이 먼저 가입되면 profiles 유니크 제약에 걸려 가입 전체가 실패한다
    if (await isNicknameTaken(supabase, nickname)) return { fieldErrors: { nickname: authMessages.nicknameTaken } };
    return { formError: authMessages.signupFailed };
  }
  if (!data.session) return { formError: authMessages.signupFailed };

  revalidatePath("/", "layout");
  return { signedUp: { nickname } };
}

export async function logout() {
  const supabase = await createClient();
  // 이 기기의 세션만 끝낸다 (다른 기기 로그인은 그대로)
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}

function simulatesServerError(formData: FormData) {
  const state = formData.get("_state");
  return readSimulatedState({ _state: typeof state === "string" ? state : undefined }) === "error";
}

/** 닉네임을 이미 쓰는지. 조회에 실패하면 null */
async function isNicknameTaken(supabase: Awaited<ReturnType<typeof createClient>>, nickname: string) {
  const { data, error } = await supabase.from("profiles").select("id").eq("nickname", nickname).limit(1);
  if (error) return null;
  return data.length > 0;
}
