import { cn } from "@/lib/utils";

// DESIGN.md count-pill/pending. 승인 대기 건수 (상세 "관리하기", 내 소셜링 호스트 카드). point 색은 이것과 trust-label에만.
// 높이 20, 모서리 full, point 바탕, on-point 글자 label.

export function CountPill({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-point px-[6px] text-label text-on-point",
        className,
      )}
    >
      {count}
      <span className="sr-only">건</span>
    </span>
  );
}
