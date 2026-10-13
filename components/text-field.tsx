import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md C1 text-field. 위에 라벨, 높이 48, 모서리 lg, 좌우 16.
// 오류면 danger 테두리 1.5px + 칸 아래 아이콘과 이유.

type TextFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  name: string;
  label: string;
  error?: string;
};

export function TextField({ name, label, error, className, ...props }: TextFieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label htmlFor={id} className="text-body-sm text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full rounded-lg border border-border-default bg-surface px-md text-body-lg text-text-primary outline-none placeholder:text-text-muted",
          // 입력 중: primary-strong 테두리 2px (테두리 1px + 안쪽 링 1px이라 글자가 움직이지 않는다)
          "focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:ring-inset",
          error && "border-[1.5px] border-danger focus:border-danger focus:ring-danger",
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-xxs text-body-sm text-danger">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
