import Link from "next/link";
import { Suspense } from "react";
import { AvatarInitial } from "@/components/avatar-initial";
import { buttonVariants } from "@/components/button";
import { HeaderLoginLink } from "@/components/header-login-link";
import type { Viewer } from "@/lib/queries/viewer";

// DESIGN.md header-main. 메인 탭 화면 위, 높이 56, 아래 border-default.
// 왼쪽 "문화소셜링"(누르면 홈). 오른쪽은 비로그인이면 sm secondary "로그인"(→ P04 ?next=지금 주소),
// 로그인이면 닉네임 첫 글자 원(avatar-initial/strong 28, → P06) (spec 8.1).

export function HeaderMain({ viewer }: { viewer: Viewer | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border-default bg-surface px-page-x">
      <Link href="/" className="flex min-h-touch-min items-center text-title-lg text-text-primary">
        문화소셜링
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
            <Link href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              로그인
            </Link>
          }
        >
          <HeaderLoginLink />
        </Suspense>
      )}
    </header>
  );
}
