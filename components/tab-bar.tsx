"use client";

import { House, MessageSquare, Search, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// DESIGN.md tab-bar. 메인 탭 화면 아래 4칸: 홈 · 탐색 · 후기 · 내 소셜링 (spec 8.1).
// surface, 위 border-default, 높이 64(테두리 포함, + 아이폰 아래 안전 영역). 활성은 primary-strong 굵게, 비활성 text-muted.
// 탐색 탭은 언제나 필터 없는 /explore로 간다 (spec M3: 아래 탭으로 탐색에 오면 초기 상태).

const TABS: { href: string; label: string; icon: LucideIcon; match: (pathname: string) => boolean }[] = [
  { href: "/", label: "홈", icon: House, match: (pathname) => pathname === "/" },
  { href: "/explore", label: "탐색", icon: Search, match: (pathname) => pathname.startsWith("/explore") },
  { href: "/reviews", label: "후기", icon: MessageSquare, match: (pathname) => pathname.startsWith("/reviews") },
  { href: "/me", label: "내 소셜링", icon: UserRound, match: (pathname) => pathname.startsWith("/me") },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="아래 탭"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-(--spacing-screen) h-[calc(64px+env(safe-area-inset-bottom))] border-t border-border-default bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid h-full grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-xxs text-label",
                  active ? "font-bold text-primary-strong" : "text-text-muted",
                )}
              >
                <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
