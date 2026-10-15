import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md C1 button. 변형: primary · secondary · danger · text-link, 크기: lg 52 · md 48 · sm 36. lg·md 글자는 700.
// 처리 중(loading)이면 스피너 + "처리 중…"으로 바뀌고 다시 누를 수 없다.

export const buttonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center gap-xs whitespace-nowrap transition-colors disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-on-primary active:bg-primary-pressed disabled:bg-surface-muted disabled:text-text-disabled",
        secondary:
          "border border-border-default bg-surface text-text-primary active:bg-surface-muted disabled:bg-surface-muted disabled:text-text-disabled",
        danger:
          "border border-danger bg-surface text-danger active:bg-danger-soft disabled:border-border-default disabled:bg-surface-muted disabled:text-text-disabled",
        "text-link": "min-h-touch-min text-body-md text-primary-strong active:text-on-primary disabled:text-text-disabled",
      },
      size: {
        lg: "h-13 rounded-lg px-lg text-body-lg font-bold",
        md: "h-12 rounded-lg px-md text-body-lg font-bold",
        // 보이는 높이는 36, 누르는 영역은 위아래로 넓혀 44
        sm: "h-9 rounded-lg px-sm text-body-md before:absolute before:inset-x-0 before:-inset-y-1",
        inline: "",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          처리 중…
        </>
      ) : (
        children
      )}
    </button>
  );
}
