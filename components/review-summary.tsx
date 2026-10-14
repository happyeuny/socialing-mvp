import { ApplicationChip } from "@/components/application-chip";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatVenue } from "@/lib/format";
import type { SocialingDetail } from "@/lib/queries/socialings";

// 후기 쓰기(P09) 맨 위 소셜링 요약 (시안 P09). manage-summary와 같은 카드 모양:
// status-badge "종료" + application-chip "참여 확정", 제목, "일시 · 장소 · 호스트 닉네임".
// 이 화면에는 참여 확정자 + 종료일 때만 들어오므로 배지와 칩은 언제나 이 둘이다.

type ReviewSummaryProps = {
  socialing: Pick<SocialingDetail, "status" | "title" | "starts_at" | "venue_type" | "venue_name" | "host_nickname">;
};

export function ReviewSummary({ socialing }: ReviewSummaryProps) {
  return (
    <section
      aria-label="소셜링 요약"
      className="flex flex-col gap-xs rounded-xl border border-border-default bg-surface p-lg"
    >
      <div className="flex flex-wrap items-center gap-[6px]">
        <StatusBadge status={socialing.status} />
        <ApplicationChip variant="accepted" />
      </div>
      <h2 className="text-title-lg break-words break-keep text-text-primary">{socialing.title}</h2>
      <p className="text-body-md break-keep text-text-secondary">
        {formatDateTime(socialing.starts_at)} · {formatVenue(socialing.venue_type, socialing.venue_name)} · 호스트{" "}
        {socialing.host_nickname}
      </p>
    </section>
  );
}
