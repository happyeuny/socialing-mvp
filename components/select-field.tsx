import { ChevronDown } from "lucide-react";
import { FieldMessage, fieldLabelClass } from "@/components/text-field";
import { cn } from "@/lib/utils";

// DESIGN.md select-field. text-field와 같은 칸(높이 48, 모서리 lg, 좌우 16) 오른쪽에 ⌄, 누르면 휴대폰 기본 고르기 목록.
// 시안 P07 장소 "강남점 ⌄" + 아래 "서울 강남구 스터디지점". 아직 안 골랐으면 자리글(placeholder)을 text-muted로.
// 오류·도움말·잠김(locked)은 text-field와 같다.

type SelectFieldProps = Omit<React.ComponentProps<"select">, "id" | "children"> & {
  name: string;
  label: string;
  /** 아무것도 고르지 않았을 때 보이는 글자 (값 "") */
  placeholder: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  helper?: React.ReactNode;
  labelTone?: "default" | "form";
  /** 잠긴 이유 (수정 P08) */
  locked?: string;
};

export function SelectField({
  name,
  label,
  placeholder,
  options,
  error,
  helper,
  labelTone = "default",
  locked,
  className,
  value,
  ...props
}: SelectFieldProps) {
  const id = `field-${name}`;
  const messageId = `${id}-${error ? "error" : "helper"}`;
  const hasMessage = Boolean(error || helper || locked);

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label htmlFor={id} className={fieldLabelClass(labelTone)}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            "h-12 w-full min-w-0 appearance-none truncate rounded-lg border border-border-default bg-surface pr-12 pl-md text-body-lg outline-none",
            "focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:ring-inset",
            "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-secondary",
            value === "" ? "text-text-muted" : "text-text-primary",
            error && "border-[1.5px] border-danger focus:border-danger focus:ring-danger",
          )}
          {...props}
          disabled={Boolean(locked) || props.disabled}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-text-primary">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-md size-5 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
      </div>
      <FieldMessage id={messageId} error={error} helper={helper} locked={locked} />
    </div>
  );
}
