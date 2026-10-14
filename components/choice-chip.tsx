import { cn } from "@/lib/utils";

// DESIGN.md choice-chip/off · choice-chip/on. 여러 개 고르는 칩(필터 시트 카테고리).
// 하나만 고르는 묶음(등록·수정 양식의 카테고리, 시안 P07)은 name을 주면 라디오가 된다.
// off: surface 바탕, text-secondary, border-default 1px / on: primary-soft 바탕, primary-strong 글자와 테두리 1.5px.
// 체크 상자·라디오라 읽기 프로그램이 고름·안 고름을 읽는다. 높이 44(누르는 영역).

export function ChoiceChip({
  label,
  checked,
  onCheckedChange,
  name,
  value,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 라디오 묶음 이름 (하나만 고를 때) */
  name?: string;
  value?: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-touch-min cursor-pointer items-center rounded-full px-md text-body-md whitespace-nowrap",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-strong",
        checked
          ? "border-[1.5px] border-primary-strong bg-primary-soft font-medium text-primary-strong"
          : "border border-border-default bg-surface text-text-secondary",
      )}
    >
      <input
        type={name ? "radio" : "checkbox"}
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
