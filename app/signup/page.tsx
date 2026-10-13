import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { safeNextPath, withNext } from "@/lib/routes";
import { SignupForm } from "./signup-form";

// P05 가입 (spec 8.2, 8.6, 8.7). 가입하면 바로 로그인되고 next 주소로 간다.
// "환영해요, ○○님" 안내와 모양은 MS3에서 더한다.

export const metadata: Metadata = { title: "가입 · 문화소셜링" };

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function SignupPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);

  return (
    <main className="flex flex-col gap-xl px-page-x py-2xl">
      <h1 className="text-title-xl text-text-primary">가입</h1>
      <SignupForm next={next} />
      <p className="flex items-center justify-center gap-xxs text-body-md text-text-secondary">
        이미 계정이 있나요?
        <Link href={withNext("/login", next)} className={buttonVariants({ variant: "text-link", size: "inline" })}>
          로그인
        </Link>
      </p>
    </main>
  );
}
