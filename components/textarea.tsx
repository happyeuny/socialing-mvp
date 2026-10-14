import { cn } from "@/lib/utils";

// DESIGN.md textarea. 위에 라벨, 최소 높이 120, 안쪽 여백 14·16, 칸 오른쪽 아래 글자 수.
// normal: text-field/default와 같은 테두리, 글자 수 text-muted "120 / 500 · 10자 이상".
// error: 글자 수가 범위를 벗어나면 danger 테두리 1.5px와 danger 글자 수 (아무것도 안 썼을 때는 normal).

type TextareaProps = Omit<React.ComponentProps<"textarea">, "id"> & {
  name: string;
  label: string;
  /** 오른쪽 아래 글자 수 문구 */
  counter: string;
  invalid?: boolean;
};

export function Textarea({ name, label, counter, invalid = false, className, ...props }: TextareaProps) {
  const id = `field-${name}`;
  const counterId = `${id}-counter`;

  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label htmlFor={id} className="text-title-md text-text-primary">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        aria-invalid={invalid || undefined}
        aria-describedby={counterId}
        className={cn(
          "min-h-30 w-full resize-y rounded-lg border border-border-default bg-surface px-md py-[14px] text-body-long text-text-primary outline-none placeholder:text-text-muted",
          "focus:border-border-strong focus:ring-1 focus:ring-border-strong focus:ring-inset",
          invalid && "border-[1.5px] border-danger focus:border-danger focus:ring-danger",
        )}
        {...props}
      />
      <p id={counterId} className={cn("self-end text-body-sm tabular-nums", invalid ? "text-danger" : "text-text-muted")}>
        {counter}
      </p>
    </div>
  );
}
