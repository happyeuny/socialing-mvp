import { CountPill } from "@/components/count-pill";
import { StatusBadge } from "@/components/status-badge";
import { StatusTag } from "@/components/status-tag";
import { formatDateTime, formatVenue } from "@/lib/format";
import type { ManagedSocialing } from "@/lib/queries/manage";

// DESIGN.md manage-summary/default. 소셜링 관리(P11) 맨 위 요약 카드 (spec 8.8):
// status-badge(+ status-tag), 제목, "일시 · 장소 · 모집 방식", "참가자 4/8명 · 스태프 1명 · 승인 대기 2".
// 스태프는 있을 때만, 승인 대기는 호스트 승인 방식이고 1건 이상일 때만 보인다.

export function ManageSummary({ socialing }: { socialing: ManagedSocialing }) {
  const joinType = socialing.join_type === "approval" ? "호스트 승인" : "선착순";
  return (
    <section
      aria-label="소셜링 요약"
      className="flex flex-col gap-xs rounded-xl border border-border-default bg-surface p-lg"
    >
      <div className="flex flex-wrap items-center gap-[6px]">
        <StatusBadge status={socialing.status} />
        {socialing.status_tag && <StatusTag tag={socialing.status_tag} />}
      </div>
      <h2 className="text-title-lg break-words break-keep text-text-primary">{socialing.title}</h2>
      <p className="text-body-md break-keep text-text-secondary">
        {formatDateTime(socialing.starts_at)} · {formatVenue(socialing.venue_type, socialing.venue_name)} · {joinType}
      </p>
      <p className="flex flex-wrap items-center gap-x-[5px] text-body-md text-text-primary">
        <span>
          참가자{" "}
          <strong className="font-bold">
            {socialing.accepted_count}/{socialing.capacity}명
          </strong>
        </span>
        {socialing.staff_count > 0 && <span>· 스태프 {socialing.staff_count}명</span>}
        {socialing.join_type === "approval" && socialing.pending_count > 0 && (
          <span className="inline-flex items-center gap-[5px]">
            · 승인 대기 <CountPill count={socialing.pending_count} />
          </span>
        )}
      </p>
    </section>
  );
}
