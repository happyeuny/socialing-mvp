import Link from "next/link";
import { AvatarInitial } from "@/components/avatar-initial";
import { CategoryArt } from "@/components/category-art";
import { StatusBadge } from "@/components/status-badge";
import { StatusTag } from "@/components/status-tag";
import { formatDateTime, formatFee } from "@/lib/format";
import { socialingPhotoUrl, type SocialingCardData } from "@/lib/queries/socialings";

// DESIGN.md socialing-card/photo · no-photo (spec 8.5). 홈·탐색·지난 소셜링 목록에 쓴다.
// 왼쪽 96px 정사각 사진(없으면 카테고리 그림), 오른쪽 위에서부터
// ① 상태 배지 + 꼬리표 ② 제목 1줄 ③ 카테고리 · 술 여부 ④ 소셜링 일시 · 장소 ⑤ 호스트 · 참여 확정 인원/정원 · 총 참가비.
// 카드 전체가 상세로 가는 링크다(제목 링크를 카드 크기로 넓힘).

export function SocialingCard({ socialing }: { socialing: SocialingCardData }) {
  const place = socialing.venue_type === "branch" ? socialing.venue_name : socialing.region_sigungu;

  return (
    <article className="relative flex gap-md rounded-xl border border-border-default bg-surface p-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-border-strong">
      {socialing.cover_photo_path ? (
        // eslint-disable-next-line @next/next/no-img-element -- 올릴 때 이미 1MB 이하로 줄인 Storage 공개 사진
        <img
          src={socialingPhotoUrl(socialing.cover_photo_path)}
          alt=""
          className="size-24 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <CategoryArt slug={socialing.category_slug} className="size-24 shrink-0 rounded-lg" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
        <div className="flex items-center gap-[6px]">
          <StatusBadge status={socialing.status} />
          {socialing.status_tag && <StatusTag tag={socialing.status_tag} />}
        </div>
        <h2 className="mt-xxs truncate text-title-md text-text-primary">
          <Link href={`/socialings/${socialing.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {socialing.title}
          </Link>
        </h2>
        <p className="truncate text-body-sm text-text-secondary">
          {socialing.category_name} · {socialing.has_alcohol ? "술 있음" : "술 없음"}
        </p>
        <p className="truncate text-body-sm text-text-secondary">
          {formatDateTime(socialing.starts_at)} · {place}
        </p>
        <p className="flex min-w-0 items-center gap-xxs text-body-sm text-text-secondary">
          <AvatarInitial nickname={socialing.host_nickname} size={20} />
          <span className="truncate font-medium text-text-primary">{socialing.host_nickname}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">
            <span className="sr-only">참가자 </span>
            {socialing.accepted_count}/{socialing.capacity}명
          </span>
          <span aria-hidden>·</span>
          <span className="shrink-0 font-medium text-text-primary">{formatFee(socialing.fee)}</span>
        </p>
      </div>
    </article>
  );
}
