import { z } from "zod";

// 로그인 P04·가입 P05 입력 (spec 6장 입력 규칙, 8.6). 폼과 서버 액션이 같은 스키마를 쓴다.
// 비밀번호 최소 길이 6은 Supabase Auth 설정값과 같다(MS1에서 확인).

export const PASSWORD_MIN = 6;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 12;

export const authMessages = {
  emailFormat: "이메일 형식이 맞지 않아요",
  passwordRequired: "비밀번호를 입력해 주세요",
  passwordMin: `비밀번호는 ${PASSWORD_MIN}자 이상이에요`,
  nicknameLength: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자예요`,
  wrongCredentials: "이메일 또는 비밀번호가 맞지 않아요",
  emailTaken: "이미 가입된 이메일이에요",
  nicknameTaken: "이미 쓰는 닉네임이에요",
  loginFailed: "로그인하지 못했어요. 다시 시도해 주세요",
  signupFailed: "가입하지 못했어요. 다시 시도해 주세요",
} as const;

const email = z.string().trim().pipe(z.email({ error: authMessages.emailFormat }));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: authMessages.passwordRequired }),
});

export const signupSchema = z.object({
  email,
  password: z.string().min(PASSWORD_MIN, { error: authMessages.passwordMin }),
  nickname: z
    .string()
    .trim()
    .min(NICKNAME_MIN, { error: authMessages.nicknameLength })
    .max(NICKNAME_MAX, { error: authMessages.nicknameLength }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type AuthField = "email" | "password" | "nickname";

/** 칸마다 첫 오류 문구 하나 */
export function fieldErrorsOf(error: z.ZodError): Partial<Record<AuthField, string>> {
  const errors: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as AuthField;
    errors[field] ??= issue.message;
  }
  return errors;
}
