import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { AvatarInitial } from "@/components/avatar-initial";
import { formatMonthDay } from "@/lib/format";
import { reviewPhotoUrl, type ReviewSummary } from "@/lib/queries/reviews";

// 인증 후기 카드. 작성자는 닉네임으로만 보인다 (spec M10, P10).

/**
 * DESIGN.md review-card/compact: surface, 테두리 없음 + shadow-card, 모서리 lg, 여백 14·16.
 * avatar-initial 20 + "닉네임 · 날짜 · 소셜링 제목" + 글 2줄.
 * 홈 "최근 인증 후기".
 */
export function ReviewCardCompact({ review }: { review: ReviewSummary }) {
  return (
    <article className="flex flex-col gap-xxs rounded-lg bg-surface px-md py-[14px] shadow-card">
      <p className="flex min-w-0 items-center gap-xxs text-body-sm text-text-secondary">
        <AvatarInitial nickname={review.author_nickname} size={20} />
        <span className="truncate">
          <span className="font-medium text-text-primary">{review.author_nickname}</span> ·{" "}
          {formatMonthDay(review.created_at)} · {review.socialing_title}
        </span>
      </p>
      <p className="line-clamp-2 text-body-md text-text-primary">{review.body}</p>
    </article>
  );
}

/**
 * DESIGN.md review-card/full-no-photo · full-with-photo (시안 P10): 목록 한 줄. 위아래 여백 20, 줄 사이 옅은 구분선은 목록이 둔다.
 * avatar-initial 32 + 닉네임 + 작성일, 오른쪽 verified-badge "참여 인증", 소셜링 제목 링크 "제목 ›"(→ P03),
 * 사진이 있으면 4:3(모서리 lg), 글(body-long, 줄바꿈 그대로).
 */
export function ReviewCardFull({ review }: { review: ReviewSummary }) {
  return (
    <article aria-label={`${review.author_nickname}님의 후기`} className="flex flex-col gap-md py-lg">
      <div className="flex items-center gap-sm">
        <AvatarInitial nickname={review.author_nickname} size={32} />
        <p className="flex min-w-0 flex-1 items-baseline gap-xs">
          <span className="truncate text-title-md text-text-primary">{review.author_nickname}</span>
          <span className="shrink-0 text-body-sm text-text-muted">{formatMonthDay(review.created_at)}</span>
        </p>
        <VerifiedBadge />
      </div>
      <Link
        href={`/socialings/${review.socialing_id}`}
        className="-my-sm flex min-h-touch-min max-w-full items-center gap-xxs self-start text-body-lg text-text-primary"
      >
        <span className="line-clamp-1">{review.socialing_title}</span>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
      </Link>
      {review.photo_path ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage 공개 주소의 사진을 그대로 보인다 (상세 대표 사진과 같음)
        <img
          src={reviewPhotoUrl(review.photo_path)}
          alt="후기 사진"
          loading="lazy"
          className="aspect-[4/3] w-full rounded-lg bg-surface-muted object-cover"
        />
      ) : null}
      <p className="text-body-long whitespace-pre-line break-words text-text-primary">{review.body}</p>
    </article>
  );
}

/** DESIGN.md verified-badge/default: surface-muted 바탕, text-secondary, 높이 22, 모서리 xs, "참여 인증" (시안) */
export function VerifiedBadge() {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-xs border border-border-default bg-surface-muted px-xs text-label text-text-secondary">
      참여 인증
    </span>
  );
}
