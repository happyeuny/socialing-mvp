import type { StatusTag as StatusTagValue } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md status-tag. 신청할 수 없는 이유(계산 값). status-badge 오른쪽에 최대 하나, 둘 다면 "신청 마감"(DB가 정함).

const LABELS: Record<StatusTagValue, string> = {
  closed: "신청 마감",
  full: "정원 마감",
};

export function StatusTag({ tag, className }: { tag: StatusTagValue; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-xs bg-surface-muted px-xs text-label whitespace-nowrap text-text-secondary",
        className,
      )}
    >
      {LABELS[tag]}
    </span>
  );
}
