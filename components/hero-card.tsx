import Link from "next/link";
import { CategoryArt } from "@/components/category-art";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatFee } from "@/lib/format";
import { socialingPhotoUrl, type SocialingCardData } from "@/lib/queries/socialings";

// DESIGN.md hero-card/default: 홈 맨 위 소셜링 1개(넘기는 배너가 아님). 대표 사진 전체(없으면 카테고리 그림을 크게),
// 아래쪽 어두운 그라데이션 위 흰 글자, 모서리 2xl, 여백 20, 최소 높이 280.
// 왼쪽 위 라벨 "지금 신청할 수 있는 가장 가까운 소셜링", 아래 status-badge · 제목 · 일시 · 장소 · 호스트 · 참가자 · 총 참가비.

export function HeroCard({ socialing }: { socialing: SocialingCardData }) {
  const place =
    socialing.venue_type === "branch" ? `스터디지점 ${socialing.venue_name}` : socialing.region_sigungu;

  return (
    <article className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl p-lg text-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-border-strong">
      {socialing.cover_photo_path ? (
        // eslint-disable-next-line @next/next/no-img-element -- 올릴 때 이미 1MB 이하로 줄인 Storage 공개 사진
        <img
          src={socialingPhotoUrl(socialing.cover_photo_path)}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <CategoryArt
          slug={socialing.category_slug}
          className="absolute inset-0 items-start pt-3xl"
          iconClassName="size-20"
        />
      )}
      {/* 흰 글자가 사진 위에서 읽히도록 아래쪽을 어둡게 */}
      <div className="absolute inset-0 bg-linear-to-t from-text-primary/90 via-text-primary/50 to-transparent" />

      <p className="relative self-start rounded-md bg-text-primary/70 px-xs py-xxs text-label">
        지금 신청할 수 있는 가장 가까운 소셜링
      </p>

      <div className="relative mt-3xl flex flex-col gap-xxs">
        <StatusBadge status={socialing.status} className="self-start" />
        <h3 className="mt-xxs text-title-lg break-words">
          <Link href={`/socialings/${socialing.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {socialing.title}
          </Link>
        </h3>
        <p className="text-body-sm">
          {formatDateTime(socialing.starts_at)} · {place}
        </p>
        <p className="text-body-sm">
          호스트 {socialing.host_nickname} · 참가자 {socialing.accepted_count}/{socialing.capacity}명 ·{" "}
          {formatFee(socialing.fee)}
        </p>
      </div>
    </article>
  );
}
