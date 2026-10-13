import Link from "next/link";
import { cn } from "@/lib/utils";

// DESIGN.md top-tabs/active-applied · active-hosted. 높이 48, 활성 탭 아래 2px text-primary 밑줄, 비활성 text-muted.
// 탭마다 주소가 달라(내 소셜링 `?tab=host`) 링크로 옮기고, 지금 탭은 aria-current로 알린다.

type TopTab = { key: string; label: string; href: string };

export function TopTabs({ label, tabs, active }: { label: string; tabs: TopTab[]; active: string }) {
  return (
    <nav aria-label={label}>
      <ul className="grid grid-flow-col auto-cols-fr border-b border-border-default">
        {tabs.map((tab) => {
          const current = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                // 같은 화면 안에서 탭만 바꾸므로 맨 위로 스크롤하지 않는다
                scroll={false}
                className={cn(
                  "-mb-px flex h-12 items-center justify-center border-b-2 text-body-lg",
                  current ? "border-text-primary text-text-primary" : "border-transparent text-text-muted",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
