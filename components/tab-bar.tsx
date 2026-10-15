"use client";

import { House, MessageSquare, Search, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// DESIGN.md tab-bar. 메인 탭 화면과 지난 소셜링(P02) 아래 4칸: 홈 · 탐색 · 후기 · 내 소셜링 (spec 8.1).
// surface, 위 border-divider, 높이 64(테두리 포함, + 아이폰 아래 안전 영역).
// 활성은 아이콘 뒤 primary-soft 알약(52×28) + primary-strong 굵게, 비활성 text-muted.
// 탐색 탭은 언제나 필터 없는 /explore로 간다 (spec M3: 아래 탭으로 탐색에 오면 초기 상태).
// 지난 소셜링은 탐색에서 한 단계 들어간 목록이라 탐색 탭이 켜진다(그 화면 자체는 아니어서 aria-current="true").

const TABS: { href: string; label: string; icon: LucideIcon; match: (pathname: string) => boolean }[] = [
  { href: "/", label: "홈", icon: House, match: (pathname) => pathname === "/" },
  {
    href: "/explore",
    label: "탐색",
    icon: Search,
    match: (pathname) => pathname.startsWith("/explore") || pathname === "/past",
  },
  { href: "/reviews", label: "후기", icon: MessageSquare, match: (pathname) => pathname.startsWith("/reviews") },
  { href: "/me", label: "내 소셜링", icon: UserRound, match: (pathname) => pathname.startsWith("/me") },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="아래 탭"
      data-toast-anchor
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-(--spacing-screen) h-[calc(64px+env(safe-area-inset-bottom))] border-t border-border-divider bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid h-full grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? (pathname === href ? "page" : "true") : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-xxs text-label",
                  active ? "font-bold text-primary-strong" : "text-text-muted",
                )}
              >
                <span
                  data-testid={active ? "tab-active-pill" : undefined}
                  className={cn("flex h-7 w-13 items-center justify-center rounded-full", active && "bg-primary-soft")}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
