import { cva } from "class-variance-authority";
import type { SocialingStatus } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md status-badge. 소셜링마다 정확히 하나. 알약 모양, 높이 24, 글자 label, 여백 4·10.
// status는 DB 값을 받는다: recruiting · confirmed · completed(종료, DESIGN ended) · canceled(호스트 취소, DESIGN host-cancelled).

const statusBadgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center rounded-full px-[10px] text-label whitespace-nowrap",
  {
    variants: {
      status: {
        recruiting: "border border-primary-strong bg-surface text-primary-strong",
        confirmed: "bg-primary text-on-primary",
        completed: "bg-surface-muted text-status-ended",
        canceled: "bg-danger-soft text-danger",
      },
    },
  },
);

const LABELS: Record<SocialingStatus, string> = {
  recruiting: "모집중",
  confirmed: "확정",
  completed: "종료",
  canceled: "호스트 취소",
};

export function StatusBadge({ status, className }: { status: SocialingStatus; className?: string }) {
  return <span className={cn(statusBadgeVariants({ status }), className)}>{LABELS[status]}</span>;
}
