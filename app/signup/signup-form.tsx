"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/button";
import { TextField } from "@/components/text-field";
import { signup, type AuthFormState } from "@/lib/actions/auth";
import { focusFirstError } from "@/lib/focus-first-error";
import { withNext } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { fieldErrorsOf, NICKNAME_MAX, signupSchema } from "@/lib/validation/auth";

export function SignupForm({ next }: { next: string }) {
  const [serverState, formAction, pending] = useActionState(signup, {} satisfies AuthFormState);
  // 브라우저에서 먼저 검사한 결과. 서버로 보내면 비우고 서버 결과를 보인다
  const [clientState, setClientState] = useState<AuthFormState | null>(null);
  const state = clientState ?? serverState;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    focusFirstError(formRef.current, state.fieldErrors, ["email", "password", "nickname"]);
  }, [state]);

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
      <div className="flex flex-col gap-xxs">
        <TextField
          name="email"
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
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
      <TextField
        name="password"
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        placeholder="6자 이상"
        error={state.fieldErrors?.password}
      />
      <TextField
        name="nickname"
        label="닉네임"
        autoComplete="nickname"
        maxLength={NICKNAME_MAX}
        placeholder="2~12자"
        error={state.fieldErrors?.nickname}
      />
      {state.formError ? (
        <p role="alert" className="text-body-sm text-danger">
          {state.formError}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="mt-xs w-full">
        가입하기
      </Button>
    </form>
  );
}
