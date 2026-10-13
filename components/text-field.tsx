import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md C1 text-field. 위에 라벨, 높이 48, 모서리 lg, 좌우 16.
// 오류면 danger 테두리 1.5px + 칸 아래 아이콘과 이유. 도움말(helper)은 칸 아래 작은 글자로, 오류가 나면 오류가 그 자리를 쓴다.
// trailing: 칸 오른쪽 안에 놓는 버튼 (password-field의 비밀번호 보기).

type TextFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  name: string;
  label: string;
  error?: string;
  helper?: string;
  trailing?: React.ReactNode;
};

export function TextField({ name, label, error, helper, trailing, className, ...props }: TextFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label htmlFor={id} className="text-body-sm text-text-secondary">
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
            trailing && "pr-12",
          )}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-0.5 flex items-center">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-xxs text-body-sm text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-body-sm text-text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
