import { CalendarSearch } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { SkeletonCardList } from "@/components/skeleton";
import { SocialingCardList } from "@/components/socialing-card";
import { listPastSocialings, type SocialingCardData } from "@/lib/queries/socialings";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";

// P02 지난 소셜링 (spec M1, 8.2, 8.6, 8.9): 소셜링 일시가 지난 소셜링을 최근 순으로, 상태는 그대로(종료·호스트 취소·모집중).
// 탐색 안의 링크로 들어오는 하위 화면이라 아래 탭 없이 header-sub.

export const metadata: Metadata = { title: "지난 소셜링 · 문화소셜링" };

export default async function PastPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const simulated = readSimulatedState(await searchParams);

  return (
    <>
      <HeaderSub title="지난 소셜링" />
      <main className="flex flex-col px-page-x pt-xl pb-xl">
        {/* 시안처럼 큰 제목을 한 번 더 보인다. 화면 제목(h1)은 머리글에 있어 화면 읽기에서는 건너뛴다 */}
        <p aria-hidden className="text-title-xl text-text-primary">
          지난 소셜링
        </p>
        <p className="mt-xxs text-body-sm text-text-secondary">소셜링 일시가 지난 소셜링 · 최근 순</p>
        <div className="mt-xl">
          {simulated === "loading" ? (
            <SkeletonCardList />
          ) : (
            <Suspense fallback={<SkeletonCardList />}>
              <PastList simulated={simulated} />
            </Suspense>
          )}
        </div>
      </main>
    </>
  );
}

async function PastList({ simulated }: { simulated: SimulatedState | null }) {
  if (simulated === "error") return <ErrorStateFull />;
  let socialings: SocialingCardData[];
  try {
    socialings = simulated === "empty" ? [] : await listPastSocialings();
  } catch (error) {
    console.error(error);
    return <ErrorStateFull />;
  }

  if (socialings.length === 0) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="지난 소셜링이 아직 없어요"
        action={{ href: "/explore", label: "탐색으로" }}
      />
    );
  }
  return <SocialingCardList socialings={socialings} />;
}
