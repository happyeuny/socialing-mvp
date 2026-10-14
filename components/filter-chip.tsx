import { ChevronDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md filter-chip/default · filter-chip/selected. 높이 36(누르는 영역은 위아래로 넓혀 44), 모서리 full.
// 값이 없으면 항목 이름 "카테고리 ⌄", 적용하면 고른 값 "강남점 ⌄"(primary-soft 바탕, primary-strong 글자와 테두리 1.5px).
// 누르면 필터 시트(O01)가 열린다. 맨 앞 동그라미(FilterIconChip)는 전체 필터.

const touchArea = "relative before:absolute before:inset-x-0 before:-inset-y-1";

export function FilterChip({ label, value, onClick }: { label: string; value: string | null; onClick: () => void }) {
  const selected = value !== null;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      // 값만 보이면 무슨 칩인지 모르니 읽기 프로그램에는 항목 이름도 읽힌다
      aria-label={selected ? `${label} ${value}` : label}
      onClick={onClick}
      className={cn(
        touchArea,
        "inline-flex h-9 shrink-0 items-center gap-xxs rounded-full pr-xs pl-sm text-body-md whitespace-nowrap",
        selected
          ? "border-[1.5px] border-primary-strong bg-primary-soft font-medium text-primary-strong"
          : "border border-border-default bg-surface text-text-primary",
      )}
    >
      {value ?? label}
      <ChevronDown className="size-4" aria-hidden />
    </button>
  );
}

export function FilterIconChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label="전체 필터"
      onClick={onClick}
      className={cn(
        touchArea,
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface text-text-primary",
      )}
    >
      <ListFilter className="size-4" aria-hidden />
    </button>
  );
}
