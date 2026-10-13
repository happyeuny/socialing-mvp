"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { PasswordField } from "@/components/password-field";
import { TextField } from "@/components/text-field";
import { login, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstError } from "@/lib/focus-first-error";
import { fieldErrorsOf, loginSchema } from "@/lib/validation/auth";

// simulateServerError: 주소에 `?_state=error`가 있으면 서버 실패 문구를 흉내 낸다 (lib/simulated-state)
export function LoginForm({ next, simulateServerError }: { next: string; simulateServerError: boolean }) {
  const [serverState, formAction, pending] = useActionState(login, {} satisfies AuthFormState);
  // 브라우저에서 먼저 검사한 결과. 서버로 보내면 비우고 서버 결과를 보인다
  const [clientState, setClientState] = useState<AuthFormState | null>(null);
  const state = clientState ?? serverState;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    focusFirstError(formRef.current, state.fieldErrors, ["email", "password"]);
  }, [state]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // 폼이 비워지지 않게 직접 보낸다 (오류가 나도 입력값 유지, spec 8.6)
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
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
      <TextField
        name="email"
        label="이메일"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="example@email.com"
        error={state.fieldErrors?.email}
      />
      <PasswordField
        name="password"
        label="비밀번호"
        autoComplete="current-password"
        placeholder="비밀번호를 입력해 주세요"
        error={state.fieldErrors?.password}
      />
      {state.formError ? (
        <p role="alert" className="text-body-sm text-danger">
          {state.formError}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="mt-xs w-full">
        로그인
      </Button>
    </form>
  );
}
