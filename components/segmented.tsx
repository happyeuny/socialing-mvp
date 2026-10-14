import Link from "next/link";
import { cn } from "@/lib/utils";

// DESIGN.md segmented/with-counts/selected. 소셜링 관리(P11) 신청자 탭 "승인 대기 2 · 참여 확정 4 · 거절·취소 1".
// surface-muted 틀(모서리 md) 안에 칸을 나눠 쓰고, 고른 칸은 surface + border-default, 글자 primary-strong.
// 탭마다 주소가 달라(`?tab=accepted`) 링크로 옮기고, 지금 탭은 aria-current로 알린다.

export type SegmentedItem = { key: string; label: string; count: number; href: string };

export function SegmentedWithCounts({ label, items, active }: { label: string; items: SegmentedItem[]; active: string }) {
  return (
    <nav aria-label={label}>
      <ul className="grid grid-flow-col auto-cols-fr gap-xxs rounded-md bg-surface-muted p-xxs">
        {items.map((item) => {
          const current = item.key === active;
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                // 같은 화면 안에서 목록만 바꾸므로 맨 위로 스크롤하지 않는다
                scroll={false}
                replace
                className={cn(
                  "flex min-h-touch-min items-center justify-center gap-[3px] rounded-md border px-xxs text-body-md whitespace-nowrap",
                  current
                    ? "border-border-default bg-surface font-medium text-primary-strong"
                    : "border-transparent text-text-secondary",
                )}
              >
                {item.label} <span className="tabular-nums">{item.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
