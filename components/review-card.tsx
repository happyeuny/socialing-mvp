import { formatMonthDay } from "@/lib/format";
import type { ReviewSummary } from "@/lib/queries/reviews";

// DESIGN.md review-card/compact: surface, border-default, 모서리 lg, 여백 14·16. "닉네임 · 날짜 · 소셜링 제목" + 글 2줄.
// 홈 "최근 인증 후기". 작성자는 닉네임으로만 보인다.

export function ReviewCardCompact({ review }: { review: ReviewSummary }) {
  return (
    <article className="flex flex-col gap-xxs rounded-lg border border-border-default bg-surface px-md py-[14px]">
      <p className="truncate text-body-sm text-text-secondary">
        <span className="font-medium text-text-primary">{review.author_nickname}</span> · {formatMonthDay(review.created_at)} ·{" "}
        {review.socialing_title}
      </p>
      <p className="line-clamp-2 text-body-md text-text-primary">{review.body}</p>
    </article>
  );
}
