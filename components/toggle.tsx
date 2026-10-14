"use client";

import { cn } from "@/lib/utils";

// DESIGN.md toggle/off · toggle/on. 48×28 바탕(꺼짐 toggle-off, 켜짐 primary-strong) + 흰 손잡이.
// 줄 전체가 하나의 스위치라 글자를 눌러도 바뀐다(누르는 영역 44 이상).

type ToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function Toggle({ label, checked, onCheckedChange, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("flex min-h-touch-min w-full items-center justify-between gap-sm text-left", className)}
    >
      <span className="text-body-lg text-text-primary">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary-strong" : "bg-toggle-off",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-6 rounded-full bg-surface transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
