"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { TextField } from "@/components/text-field";
import { showToast } from "@/components/toast";
import { signup, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstError } from "@/lib/focus-first-error";
import { withNext } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { fieldErrorsOf, NICKNAME_MAX, NICKNAME_MIN, PASSWORD_MIN, signupSchema } from "@/lib/validation/auth";

// simulateServerError: 주소에 `?_state=error`가 있으면 서버 실패 문구를 흉내 낸다 (lib/simulated-state)
export function SignupForm({ next, simulateServerError }: { next: string; simulateServerError: boolean }) {
  const router = useRouter();
  const [serverState, formAction, pending] = useActionState(signup, {} satisfies AuthFormState);
  // 브라우저에서 먼저 검사한 결과. 서버로 보내면 비우고 서버 결과를 보인다
  const [clientState, setClientState] = useState<AuthFormState | null>(null);
  const state = clientState ?? serverState;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    focusFirstError(formRef.current, state.fieldErrors, ["email", "password", "nickname"]);
  }, [state]);

  // 가입하면 바로 로그인된 상태로 next 주소(없으면 홈)에 가고, 그 화면 아래에 환영 안내가 잠깐 뜬다 (spec 8.6)
  const signedUp = serverState.signedUp;
  useEffect(() => {
    if (!signedUp) return;
    showToast({ message: `환영해요, ${signedUp.nickname}님` });
    router.replace(next);
  }, [signedUp, next, router]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // 폼이 비워지지 않게 직접 보낸다 (오류가 나도 입력값 유지, spec 8.6)
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = signupSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      nickname: formData.get("nickname"),
    });
    if (!parsed.success) {
      setClientState({ fieldErrors: fieldErrorsOf(parsed.error) });
      return;
    }
    setClientState(null);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-md">
      <input type="hidden" name="next" value={next} />
      {simulateServerError ? <input type="hidden" name="_state" value="error" /> : null}
      <div className="flex flex-col gap-xxs">
        <TextField
          name="email"
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="example@email.com"
          error={state.fieldErrors?.email}
        />
        {state.emailTaken ? (
          <Link
            href={withNext("/login", next)}
            className={cn(buttonVariants({ variant: "text-link", size: "inline" }), "self-start")}
          >
            로그인하기
          </Link>
        ) : null}
      </div>
      <PasswordField
        name="password"
        label="비밀번호"
        autoComplete="new-password"
        placeholder="비밀번호를 입력해 주세요"
        helper={`${PASSWORD_MIN}자 이상`}
        error={state.fieldErrors?.password}
      />
      <TextField
        name="nickname"
        label="닉네임"
        autoComplete="nickname"
        maxLength={NICKNAME_MAX}
        placeholder="닉네임을 입력해 주세요"
        helper={`${NICKNAME_MIN}~${NICKNAME_MAX}자 · 후기와 호스트 이름으로 보여요`}
        error={state.fieldErrors?.nickname}
      />
      {state.formError ? (
        <p role="alert" className="text-body-sm text-danger">
          {state.formError}
        </p>
      ) : null}
      {/* 가입한 뒤 다음 화면으로 옮겨 가는 동안에도 잠가 둔다 */}
      <Button type="submit" loading={pending || Boolean(signedUp)} className="mt-xs w-full">
        가입하고 시작하기
      </Button>
    </form>
  );
}
