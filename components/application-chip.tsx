import { cva } from "class-variance-authority";
import type { ApplicationStatus } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md application-chip. 한 사람의 신청 상태. status-badge와 같은 알약(테두리 없음, 높이 24, 글자 label).
// 같이 놓이면 status-badge가 앞이다. variant는 DESIGN 이름, 신청 상태(DB 값)는 chipVariantOf()로 바꾼다.

export type ApplicationChipVariant = "pending" | "accepted" | "rejected" | "withdrawn" | "host-cancelled";

const applicationChipVariants = cva(
  "inline-flex h-6 shrink-0 items-center rounded-full px-[10px] text-label whitespace-nowrap",
  {
    variants: {
      variant: {
        pending: "bg-surface-muted text-text-secondary",
        accepted: "bg-primary-soft text-primary-strong",
        rejected: "bg-danger-soft text-danger",
        withdrawn: "bg-surface-muted text-text-muted",
        "host-cancelled": "bg-danger-soft text-danger",
      },
    },
  },
);

const LABELS: Record<ApplicationChipVariant, string> = {
  pending: "승인 대기",
  accepted: "참여 확정",
  rejected: "거절",
  withdrawn: "신청 취소",
  "host-cancelled": "호스트 취소",
};

/** 신청 상태(DB) → 칩 이름. 본인이 취소한 신청(canceled)은 withdrawn "신청 취소" */
export function chipVariantOf(status: ApplicationStatus): ApplicationChipVariant {
  return status === "canceled" ? "withdrawn" : status;
}

export function ApplicationChip({ variant, className }: { variant: ApplicationChipVariant; className?: string }) {
  return <span className={cn(applicationChipVariants({ variant }), className)}>{LABELS[variant]}</span>;
}
