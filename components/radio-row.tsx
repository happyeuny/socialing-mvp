import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md radio-row. 필터 시트(O01) 장소 목록 한 줄(시안 O01): 왼쪽 동그라미 + 이름(body-lg) + 지역(body-sm, text-secondary),
// 줄 사이 옅은 구분선, 높이 52. 고르면 동그라미가 primary-strong으로 채워진다.
// RadioRowNext는 지역 시·도 줄(오른쪽 ›, 누르면 구 목록), RadioRowBack은 구 목록 위 "‹ 서울특별시"(시·도 목록으로).

export function RadioRow({
  name,
  value,
  label,
  sub,
  checked,
  onSelect,
}: {
  name: string;
  value: string;
  label: string;
  sub?: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-13 cursor-pointer items-center gap-sm border-b border-border-divider",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-border-strong",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-primary-strong bg-primary-strong" : "border-border-default bg-surface",
        )}
      >
        {checked ? <span className="size-2 rounded-full bg-surface" /> : null}
      </span>
      <span className="flex min-w-0 items-baseline gap-xs">
        <span className={cn("text-body-lg text-text-primary", checked && "font-medium")}>{label}</span>
        {sub ? <span className="truncate text-body-sm text-text-secondary">{sub}</span> : null}
      </span>
    </label>
  );
}

export function RadioRowNext({ label, sub, onClick }: { label: string; sub?: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-13 w-full items-center gap-sm border-b border-border-divider text-left"
    >
      <span className="flex min-w-0 flex-1 items-baseline gap-xs">
        <span className="text-body-lg text-text-primary">{label}</span>
        {sub ? <span className="truncate text-body-sm font-medium text-primary-strong">{sub}</span> : null}
      </span>
      <ChevronRight className="size-5 shrink-0 text-text-secondary" aria-hidden />
    </button>
  );
}

export function RadioRowBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-touch-min w-full items-center gap-xxs border-b border-border-divider text-left text-body-md text-primary-strong"
    >
      <ChevronLeft className="size-5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
