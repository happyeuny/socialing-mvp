"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/in-app-history";

// DESIGN.md header-sub. 하위 화면 위: 뒤로 아이콘 + 화면 제목(title-md, 700), 높이 56, 아래 border-divider.
// with-action: 오른쪽에 text-link 하나 (예: 소셜링 관리의 "상세 보기 ›").
// 뒤로: 앱 안 이전 화면이 있으면 그리로, 없으면(공유 링크로 바로 들어옴) 홈 (spec 8.7).

type HeaderSubProps = {
  title: string;
  action?: React.ReactNode;
};

export function HeaderSub({ title, action }: HeaderSubProps) {
  const router = useRouter();

  function goBack() {
    if (canGoBackInApp()) router.back();
    else router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-xxs border-b border-border-divider bg-surface pr-page-x pl-xxs">
      <button
        type="button"
        onClick={goBack}
        aria-label="뒤로"
        className="inline-flex size-touch-min shrink-0 items-center justify-center text-text-primary"
      >
        <ChevronLeft className="size-6" aria-hidden />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-title-md font-bold text-text-primary">{title}</h1>
      {action}
    </header>
  );
}
