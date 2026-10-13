import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { HeaderSub } from "@/components/header-sub";
import { safeNextPath, withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { LoginForm } from "./login-form";

// P04 로그인 (spec 8.2, 8.6, 8.7). 로그인한 사람은 proxy.ts가 next 주소로 보낸다.
// 머리글은 header-sub(뒤로 + "로그인"). 시안의 머리글 오른쪽 사람 아이콘은 두지 않는다(DESIGN.md "시안과 다르게 정한 것").

export const metadata: Metadata = { title: "로그인 · 문화소셜링" };

type Props = { searchParams: Promise<{ next?: string | string[]; _state?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <>
      <HeaderSub title="로그인" />
      <main className="flex flex-col gap-xl px-page-x py-xl">
        <p className="text-body-md text-text-secondary">로그인하면 보던 화면으로 돌아가요</p>
        <LoginForm next={next} simulateServerError={readSimulatedState(params) === "error"} />
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
