import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md C1 text-field. 위에 라벨, 높이 48, 모서리 lg, 좌우 16.
// 오류면 danger 테두리 1.5px + 칸 아래 아이콘과 이유. 도움말(helper)은 칸 아래 작은 글자로, 오류가 나면 오류가 그 자리를 쓴다.
// trailing: 칸 오른쪽 안에 놓는 버튼 (password-field의 비밀번호 보기). suffix: 칸 오른쪽 안 단위 글자 ("원").
// labelTone="form": 등록·수정(P07·P08) 양식의 라벨(시안). body-lg text-primary로 묶음 제목과 같은 무게.

type TextFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  name: string;
  label: string;
  error?: string;
  helper?: string;
  trailing?: React.ReactNode;
  suffix?: string;
  labelTone?: "default" | "form";
};

export function TextField({
  name,
  label,
  error,
  helper,
  trailing,
  suffix,
  labelTone = "default",
  className,
  ...props
}: TextFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label htmlFor={id} className={fieldLabelClass(labelTone)}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 w-full rounded-lg border border-border-default bg-surface px-md text-body-lg text-text-primary outline-none placeholder:text-text-muted",
            // 입력 중: primary-strong 테두리 2px (테두리 1px + 안쪽 링 1px이라 글자가 움직이지 않는다)
            "focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:ring-inset",
            error && "border-[1.5px] border-danger focus:border-danger focus:ring-danger",
            (trailing || suffix) && "pr-12",
          )}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-0.5 flex items-center">{trailing}</div> : null}
        {suffix ? (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-md flex items-center text-body-lg text-text-primary">
            {suffix}
          </span>
        ) : null}
      </div>
      <FieldMessage id={error ? errorId : helperId} error={error} helper={helper} />
    </div>
  );
}

/** 칸 라벨 글자. default: body-sm text-secondary (로그인·가입), form: body-lg text-primary (등록·수정 양식, 시안 P07) */
export function fieldLabelClass(tone: "default" | "form" = "default") {
  return tone === "form" ? "text-body-lg text-text-primary" : "text-body-sm text-text-secondary";
}

/** 칸 아래 한 줄: 오류(아이콘 + danger)가 있으면 오류, 없으면 도움말(text-muted) */
export function FieldMessage({ id, error, helper }: { id: string; error?: string; helper?: React.ReactNode }) {
  if (error) {
    return (
      <p id={id} className="flex items-center gap-xxs text-body-sm text-danger">
        <CircleAlert className="size-3.5 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (!helper) return null;
  return (
    <p id={id} className="text-body-sm text-text-muted">
      {helper}
    </p>
  );
}
