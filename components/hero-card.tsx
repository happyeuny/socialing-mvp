import Link from "next/link";
import { CategoryIcon } from "@/components/category-art";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatFee } from "@/lib/format";
import { socialingPhotoUrl, type SocialingCardData } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md hero-card: 홈 맨 위 소셜링 1개(넘기는 배너가 아님). 모서리 2xl, 여백 20, 최소 높이 280.
// default: 대표 사진 전체 + 아래쪽 어두운 그라데이션 위 흰 글자.
// no-photo: 짙은 청록 그라데이션 바탕(--hero-no-photo) + 오른쪽 위 카테고리 선 아이콘 132(흰색 13%) + 왼쪽 아래 primary 빛.
// 왼쪽 위 라벨 "지금 신청할 수 있는 가장 가까운 소셜링", 아래 status-badge · 제목 · 일시 · 장소 · 호스트 · 참가자 · 총 참가비.

export function HeroCard({ socialing }: { socialing: SocialingCardData }) {
  const place =
    socialing.venue_type === "branch" ? `스터디지점 ${socialing.venue_name}` : socialing.region_sigungu;
  const hasPhoto = Boolean(socialing.cover_photo_path);

  return (
    <article
      className={cn(
        "relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl p-lg text-surface has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-border-strong",
        !hasPhoto && "bg-(image:--hero-no-photo)",
      )}
    >
      {socialing.cover_photo_path ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- 올릴 때 이미 1MB 이하로 줄인 Storage 공개 사진 */}
          <img
            src={socialingPhotoUrl(socialing.cover_photo_path)}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          {/* 흰 글자가 사진 위에서 읽히도록 아래쪽을 어둡게 */}
          <div className="absolute inset-0 bg-linear-to-t from-text-primary/90 via-text-primary/50 to-transparent" />
        </>
      ) : (
        <>
          <CategoryIcon
            slug={socialing.category_slug}
            className="absolute top-lg right-lg size-[132px] text-surface/13"
          />
          <div className="absolute inset-0 bg-(image:--hero-no-photo-glow)" />
        </>
      )}

      <p
        className={cn(
          "relative self-start rounded-md px-xs py-xxs text-label",
          hasPhoto ? "bg-text-primary/70" : "bg-surface/14 font-semibold",
        )}
      >
        지금 신청할 수 있는 가장 가까운 소셜링
      </p>

      <div className="relative mt-3xl flex flex-col gap-xxs">
        <StatusBadge status={socialing.status} className={cn("self-start", !hasPhoto && "border-transparent")} />
        <h3 className="mt-xxs text-title-lg break-words">
          <Link href={`/socialings/${socialing.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {socialing.title}
          </Link>
        </h3>
        <p className={cn("text-body-sm", !hasPhoto && "text-surface/86")}>
          {formatDateTime(socialing.starts_at)} · {place}
        </p>
        <p className={cn("text-body-sm", !hasPhoto && "text-surface/86")}>
          호스트 {socialing.host_nickname} · 참가자 {socialing.accepted_count}/{socialing.capacity}명 ·{" "}
          {formatFee(socialing.fee)}
        </p>
      </div>
    </article>
  );
}
