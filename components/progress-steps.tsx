import type { SocialingStatus } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md progress-steps. 소셜링 관리(P11)의 "소셜링 상태": 모집중 → 확정 → 종료 세 점, 지금 단계만 text-primary 굵게.
// current-recruiting · current-confirmed · done-ended(종료까지 모두 지남) · host-cancelled(세 점 흐리게 + danger "호스트 취소").
// 상세에는 쓰지 않고 status-badge만 쓴다.

const STEPS = [
  { status: "recruiting", label: "모집중" },
  { status: "confirmed", label: "확정" },
  { status: "completed", label: "종료" },
] as const;

export function ProgressSteps({ status }: { status: SocialingStatus }) {
  const cancelled = status === "canceled";
  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <div className="flex flex-col gap-xs">
      <ol aria-label="소셜링 진행 단계" className="grid grid-cols-3">
        {STEPS.map((step, index) => {
          const current = index === currentIndex;
          const passed = currentIndex >= 0 && index < currentIndex;
          return (
            <li
              key={step.status}
              aria-current={current ? "step" : undefined}
              className="relative flex flex-col items-center gap-xs"
            >
              {/* 점 사이 선: 왼쪽 점의 가운데에서 이 점의 가운데까지. 점이 선 위에 오도록 점에 z-10 */}
              {index > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[7px] right-1/2 h-0.5 w-full",
                    passed || current ? "bg-text-secondary" : "bg-border-default",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 size-4 rounded-full border-2",
                  cancelled
                    ? "border-border-default bg-surface"
                    : current
                      ? "border-text-primary bg-text-primary"
                      : passed
                        ? "border-text-secondary bg-text-secondary"
                        : "border-border-default bg-surface",
                )}
              />
              <span
                className={cn(
                  "text-body-md",
                  cancelled
                    ? "text-text-disabled"
                    : current
                      ? "font-bold text-text-primary"
                      : passed
                        ? "text-text-secondary"
                        : "text-text-muted",
                )}
              >
                {step.label}
                {current && <span className="sr-only"> (지금 단계)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {cancelled && <p className="text-center text-body-md font-medium text-danger">호스트 취소</p>}
    </div>
  );
}
