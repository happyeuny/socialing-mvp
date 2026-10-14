import { cn } from "@/lib/utils";

// DESIGN.md question-block + segmented/binary. 후기 쓰기(P09)의 비공개 확인 질문 하나:
// 질문 글(body-md, text-primary) 아래 "예" · "아니오" 두 칸(시안: 회색 상자 안 흰 버튼 두 개).
// 고른 칸은 text-primary 테두리 1.5px + 굵은 글자. 라디오 묶음이라 화살표 키로 고를 수 있다.

type QuestionBlockProps = {
  /** 라디오 묶음 이름 */
  name: string;
  question: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

const OPTIONS = [
  { value: true, label: "예" },
  { value: false, label: "아니오" },
] as const;

export function QuestionBlock({ name, question, value, onChange, disabled = false }: QuestionBlockProps) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-xs text-body-md break-keep text-text-primary">{question}</legend>
      <div className="grid grid-cols-2 gap-xs">
        {OPTIONS.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={option.label}
              className={cn(
                "flex h-12 cursor-pointer items-center justify-center rounded-lg border bg-surface text-body-lg text-text-primary",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-border-strong",
                checked ? "border-[1.5px] border-text-primary font-bold" : "border-border-default",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value ? "yes" : "no"}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
