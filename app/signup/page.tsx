import { Drama } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { HeaderSub } from "@/components/header-sub";
import { safeNextPath, withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { SignupForm } from "./signup-form";

// P05 가입 (spec 8.2, 8.6, 8.7). 가입하면 바로 로그인되고 next 주소로 가며 "환영해요, ○○님"이 잠깐 뜬다.
// 시안의 머리글 오른쪽 사람 아이콘은 두지 않는다(DESIGN.md "시안과 다르게 정한 것").

export const metadata: Metadata = { title: "가입 · 문화소셜링" };

type Props = { searchParams: Promise<{ next?: string | string[]; _state?: string | string[] }> };

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <>
      <HeaderSub title="가입" />
      <main className="flex flex-col gap-xl px-page-x py-xl">
        <SignupIntro />
        <SignupForm next={next} simulateServerError={readSimulatedState(params) === "error"} />
        <p className="flex items-center justify-center gap-xxs text-body-md text-text-secondary">
          이미 계정이 있나요?
          <Link href={withNext("/login", next)} className={buttonVariants({ variant: "text-link", size: "inline" })}>
            로그인
          </Link>
        </p>
      </main>
    </>
  );
}

/** DESIGN.md signup-intro: 라벨 알약 + 한 줄 안내 + 오른쪽 장식 아이콘 상자 */
function SignupIntro() {
  return (
    <div className="flex items-center justify-between gap-md">
      <div className="flex flex-col items-start gap-xs">
        <span className="inline-flex h-6 items-center rounded-full bg-primary-soft px-2.5 text-label text-primary-strong">
          새로운 여정
        </span>
        <p className="text-title-lg text-text-primary">함께할 문화 메이트를 찾아요</p>
      </div>
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border-default bg-surface">
        <Drama className="size-6 text-primary-strong" aria-hidden />
      </div>
    </div>
  );
}
