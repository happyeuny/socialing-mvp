import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { HeaderSub } from "@/components/header-sub";
import { safeNextPath, withNext } from "@/lib/routes";
import { LoginForm } from "./login-form";

// P04 로그인 (spec 8.2, 8.6, 8.7). 로그인한 사람은 proxy.ts가 next 주소로 보낸다.
// 머리글은 header-sub(뒤로 + "로그인"). 나머지 모양은 MS3에서 다듬는다.

export const metadata: Metadata = { title: "로그인 · 문화소셜링" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);

  return (
    <>
      <HeaderSub title="로그인" />
      <main className="flex flex-col gap-xl px-page-x py-xl">
        <LoginForm next={next} />
        <p className="flex items-center justify-center gap-xxs text-body-md text-text-secondary">
          아직 계정이 없나요?
          <Link href={withNext("/signup", next)} className={buttonVariants({ variant: "text-link", size: "inline" })}>
            가입하기
          </Link>
        </p>
      </main>
    </>
  );
}
