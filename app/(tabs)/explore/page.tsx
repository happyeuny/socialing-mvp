import { CalendarSearch, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { SkeletonCardList } from "@/components/skeleton";
import { SocialingCardList } from "@/components/socialing-card";
import { listCurrentSocialings, type SocialingCardData } from "@/lib/queries/socialings";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";
import { cn } from "@/lib/utils";

// P01 탐색 (spec M1, 8.2, 8.6): 소셜링 일시가 지나지 않은 소셜링을 가까운 일시 순으로.
// 제목·기준 문구는 바로 보이고, 목록 자리만 불러오는 동안 스켈레톤, 실패하면 그 자리에 다시 시도.
// 필터 칩과 "파티·사교 숨기기" 토글은 MS6.

export const metadata: Metadata = { title: "탐색 · 문화소셜링" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const simulated = readSimulatedState(await searchParams);

  return (
    <main className="flex flex-col px-page-x pt-xl pb-xl">
      <h1 className="text-title-xl text-text-primary">탐색</h1>
      <p className="mt-xxs text-body-sm text-text-secondary">가까운 일시 순 · 유료 노출 없음</p>
      <div className="mt-xl">
        {simulated === "loading" ? (
          <SkeletonCardList />
        ) : (
          <Suspense fallback={<SkeletonCardList />}>
            <ExploreList simulated={simulated} />
          </Suspense>
        )}
      </div>
    </main>
  );
}

async function ExploreList({ simulated }: { simulated: SimulatedState | null }) {
  let socialings: SocialingCardData[];
  if (simulated === "error") return <ErrorStateFull />;
  try {
    socialings = simulated === "empty" ? [] : await listCurrentSocialings();
  } catch (error) {
    console.error(error);
    return <ErrorStateFull />;
  }

  // 필터가 생기면(MS6) 필터 결과 0은 "조건에 맞는 소셜링이 없어요" + 필터 초기화로 나눈다.
  if (socialings.length === 0) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="지금 열린 소셜링이 없어요"
        action={{ href: "/past", label: "지난 소셜링 보기" }}
      />
    );
  }

  return (
    <>
      <p className="text-body-sm text-text-secondary">소셜링 {socialings.length}개</p>
      <div className="mt-sm">
        <SocialingCardList socialings={socialings} />
      </div>
      <Link href="/past" className={cn("mt-md", buttonVariants({ variant: "text-link", size: "inline" }))}>
        지난 소셜링 보기
        <ChevronRight className="-ml-1 size-4" aria-hidden />
      </Link>
    </>
  );
}
