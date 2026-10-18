import type { SocialingCardData, StatusTag as StatusTagValue } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md status-tag. 신청할 수 없는 이유 또는 최소 인원까지 남은 수(계산 값). status-badge 오른쪽에 최대 하나.
// 신청 마감·정원 마감은 DB가 정한 status_tag(둘 다면 "신청 마감"), 그것이 없고 모집중이면 needed_count로
// "최소 인원까지 N명"(min-needed, MS15 U4). 확정 대기·취소·호스트 취소·종료에는 꼬리표가 없다.

const LABELS: Record<StatusTagValue, string> = {
  closed: "신청 마감",
  full: "정원 마감",
};

type TagSource = Pick<SocialingCardData, "display_status" | "status_tag" | "needed_count">;

/** 그 소셜링의 꼬리표 글자. 없으면 null */
export function statusTagLabel(socialing: TagSource): string | null {
  if (socialing.status_tag) return LABELS[socialing.status_tag];
  if (socialing.display_status === "recruiting" && socialing.needed_count) {
    return `최소 인원까지 ${socialing.needed_count}명`;
  }
  return null;
}

export function StatusTag({ socialing, className }: { socialing: TagSource; className?: string }) {
  const label = statusTagLabel(socialing);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-xs bg-surface-muted px-xs text-label whitespace-nowrap text-text-secondary",
        className,
      )}
    >
      {label}
    </span>
  );
}
