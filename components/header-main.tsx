import Link from "next/link";
import { Suspense } from "react";
import { AvatarInitial } from "@/components/avatar-initial";
import { buttonVariants } from "@/components/button";
import { HeaderLoginLink } from "@/components/header-login-link";
import { LogoWordmark } from "@/components/logo-wordmark";
import type { Viewer } from "@/lib/queries/viewer";
import { cn } from "@/lib/utils";

// DESIGN.md header-main. 메인 탭 화면 위, 높이 56, 아래 border-divider.
// 왼쪽 logo-wordmark "문화소셜링"(누르면 홈). 오른쪽은 비로그인이면 알약 모양 "로그인"(→ P04 ?next=지금 주소),
// 로그인이면 닉네임 첫 글자 원(avatar-initial/strong 28, → P06) (spec 8.1).

/** 머리글 "로그인": sm 버튼을 primary 바탕, on-primary 글자 700, 모서리 full로 (머리글 로그인에만 쓰는 모양) */
const LOGIN_CLASS = cn(buttonVariants({ variant: "primary", size: "sm" }), "rounded-full font-bold");

export function HeaderMain({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-divider bg-surface px-page-x">
      <Link href="/" className="flex min-h-touch-min items-center">
        <LogoWordmark />
      </Link>
      {viewer ? (
        <Link
          href="/me"
          aria-label={`내 소셜링 (${viewer.nickname})`}
          className="-mr-xs inline-flex size-touch-min items-center justify-center"
        >
          <AvatarInitial nickname={viewer.nickname} tone="strong" size={28} />
        </Link>
      ) : (
        // 지금 주소(쿼리 포함)를 읽어야 해서 브라우저 쪽 부품으로 둔다
        <Suspense
          fallback={
            <Link href="/login" className={LOGIN_CLASS}>
              로그인
            </Link>
          }
        >
          <HeaderLoginLink className={LOGIN_CLASS} />
        </Suspense>
      )}
    </header>
  );
}
