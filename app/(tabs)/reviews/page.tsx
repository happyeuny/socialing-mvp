import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { ReviewCardFull } from "@/components/review-card";
import { SkeletonReviewList } from "@/components/skeleton";
import { listRecentReviews, REVIEW_FEED_LIMIT, type ReviewSummary } from "@/lib/queries/reviews";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";

// P10 인증 후기 (spec M10, 8.2, 8.6): 공개된 인증 후기를 최신순으로. 로그인 없이 본다.
// 시안대로 흰 바탕에 옅은 구분선으로 나눈 목록. 제목·기준 문구는 바로 보이고, 목록 자리만 불러오는 동안 스켈레톤.
// 맞춤 정렬, 좋아요, 댓글은 없다.

export const metadata: Metadata = { title: "인증 후기 · 문화소셜링" };

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const simulated = readSimulatedState(await searchParams);

  return (
    <main className="flex min-h-[calc(100dvh-56px-64px)] flex-col bg-surface">
      <div className="border-b border-border-divider px-page-x pt-xl pb-lg">
        <h1 className="text-title-xl text-text-primary">인증 후기</h1>
        <p className="mt-xxs text-body-sm text-text-secondary">참여를 마친 사람만 쓸 수 있어요 · 최신순</p>
      </div>
      <div className="px-page-x">
        {simulated === "loading" ? (
          <SkeletonReviewList />
        ) : (
          <Suspense fallback={<SkeletonReviewList />}>
            <ReviewList simulated={simulated} />
          </Suspense>
        )}
      </div>
    </main>
  );
}

async function ReviewList({ simulated }: { simulated: SimulatedState | null }) {
  let reviews: ReviewSummary[];
  if (simulated === "error") return <ErrorStateFull />;
  try {
    reviews = simulated === "empty" ? [] : await listRecentReviews(REVIEW_FEED_LIMIT);
  } catch (error) {
    console.error(error);
    return <ErrorStateFull />;
  }

  if (reviews.length === 0) {
    return <EmptyState icon={MessageSquare} title="아직 후기가 없어요" action={{ href: "/explore", label: "탐색하기" }} />;
  }

  return (
    <ul className="flex flex-col divide-y divide-border-divider">
      {reviews.map((review) => (
        <li key={review.id}>
          <ReviewCardFull review={review} />
        </li>
      ))}
    </ul>
  );
}
