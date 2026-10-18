import { cva } from "class-variance-authority";
import type { DisplayStatus } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md status-badge. 소셜링마다 정확히 하나. 알약 모양, 높이 24, 글자 label, 여백 4·10.
// status는 DB가 계산한 보이는 상태(display_status, MS15 U4)를 받는다:
// recruiting · awaiting_confirm(확정 대기) · confirmed · completed(종료, DESIGN ended) ·
// host_canceled(호스트 취소: 직접 취소 또는 확정 기한까지 확정하지 않음, DESIGN host-cancelled) · auto_canceled(취소: 최소 인원 미달, DESIGN cancelled).

const statusBadgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center rounded-full px-[10px] text-label whitespace-nowrap",
  {
    variants: {
      status: {
        recruiting: "border border-primary-strong bg-surface text-primary-strong",
        awaiting_confirm: "bg-primary-soft text-primary-strong",
        confirmed: "bg-primary text-on-primary",
        completed: "bg-surface-muted text-status-ended",
        host_canceled: "bg-danger-soft text-danger",
        auto_canceled: "bg-danger-soft text-danger",
      },
    },
  },
);

const LABELS: Record<DisplayStatus, string> = {
  recruiting: "모집중",
  awaiting_confirm: "확정 대기",
  confirmed: "확정",
  completed: "종료",
  host_canceled: "호스트 취소",
  auto_canceled: "취소",
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  return <span className={cn(statusBadgeVariants({ status }), className)}>{LABELS[status]}</span>;
}
