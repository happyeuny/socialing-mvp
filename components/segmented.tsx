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

// DESIGN.md segmented/date-filter/selected. 하나만 고르는 칸(필터 시트의 날짜 "전체 · 오늘 · 이번 주 · 이번 주말",
// 장소 갈래 "스터디지점 · 지역 (시·도 → 구)"). 같은 surface-muted 틀에 고른 칸만 surface + border-default, 글자 primary-strong.
// 라디오 묶음이라 화살표 키로 고를 수 있다. 칸 높이는 누르는 영역 44.
// disabled: 바꿀 수 없는 묶음(수정 P08의 잠긴 칸). 고른 칸 글자도 text-secondary, 이유는 describedBy로 잇는다.

export type SegmentedOption<T extends string> = { value: T; label: string };

export function SegmentedChoice<T extends string>({
  name,
  labelledBy,
  options,
  value,
  onChange,
  disabled = false,
  describedBy,
}: {
  name: string;
  /** 묶음 이름이 되는 제목의 id */
  labelledBy: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** 묶음 아래 설명·이유의 id */
  describedBy?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      className="grid grid-flow-col auto-cols-fr gap-xxs rounded-md bg-surface-muted p-xxs"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex min-h-touch-min min-w-0 items-center justify-center rounded-md border px-xxs text-body-md whitespace-nowrap",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-strong",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              checked
                ? cn("border-border-default bg-surface font-medium", disabled ? "text-text-secondary" : "text-primary-strong")
                : cn("border-transparent", disabled ? "text-text-disabled" : "text-text-secondary"),
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
