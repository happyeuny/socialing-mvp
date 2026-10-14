import { CalendarSearch, ChevronRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { SkeletonCardList } from "@/components/skeleton";
import { SocialingCardList } from "@/components/socialing-card";
import {
  filterSocialings,
  hasAnyFilter,
  parseExploreFilter,
  type FilterableSocialing,
  type FilterCatalog,
} from "@/lib/explore-filter";
import { getFilterCatalog } from "@/lib/queries/catalog";
import { listExploreSocialings, type ExploreSocialing } from "@/lib/queries/socialings";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";
import { cn } from "@/lib/utils";
import { ExploreFilters } from "./explore-filters";

// P01 탐색 (spec M1, M2, M3, 8.2, 8.6, 8.7): 소셜링 일시가 지나지 않은 소셜링을 가까운 일시 순으로.
// 필터·"파티·사교 숨기기" 값은 주소(`/explore?…`, lib/explore-filter.ts)에 있어 상세에 갔다 뒤로 와도 그대로이고,
// 아래 탭으로 오면 주소가 `/explore`라 처음 상태다. 제목·기준 문구는 바로 보이고, 나머지는 불러오는 동안 스켈레톤.

export const metadata: Metadata = { title: "탐색 · 문화소셜링" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const simulated = readSimulatedState(params);

  return (
    <main className="flex flex-col px-page-x pt-xl pb-xl">
      <h1 className="text-title-xl text-text-primary">탐색</h1>
      <p className="mt-xxs text-body-sm text-text-secondary">가까운 일시 순 · 유료 노출 없음</p>
      <div className="mt-md">
        {simulated === "loading" ? (
          <SkeletonCardList />
        ) : (
          <Suspense fallback={<SkeletonCardList />}>
            <ExploreBody params={params} simulated={simulated} />
          </Suspense>
        )}
      </div>
    </main>
  );
}

async function ExploreBody({ params, simulated }: { params: SearchParams; simulated: SimulatedState | null }) {
  let catalog: FilterCatalog;
  let socialings: ExploreSocialing[];
  if (simulated === "error") return <ErrorStateFull />;
  try {
    [catalog, socialings] = await Promise.all([
      getFilterCatalog(),
      simulated === "empty" ? Promise.resolve([]) : listExploreSocialings(),
    ]);
  } catch (error) {
    console.error(error);
    return <ErrorStateFull />;
  }

  const filter = parseExploreFilter(params, catalog);
  const shown = filterSocialings(socialings, filter, catalog, new Date());

  return (
    <>
      <ExploreFilters filter={filter} catalog={catalog} socialings={socialings.map(filterableOf)} />
      <div className="mt-lg">
        <ExploreList socialings={shown} filtered={hasAnyFilter(filter)} />
      </div>
    </>
  );
}

/** 필터 시트 개수 계산에 쓰는 칸만 브라우저로 */
function filterableOf(s: ExploreSocialing): FilterableSocialing {
  return {
    category_slug: s.category_slug,
    category_is_party: s.category_is_party,
    venue_type: s.venue_type,
    venue_id: s.venue_id,
    region_sido: s.region_sido,
    region_sigungu: s.region_sigungu,
    starts_at: s.starts_at,
  };
}

function ExploreList({ socialings, filtered }: { socialings: ExploreSocialing[]; filtered: boolean }) {
  if (socialings.length === 0) {
    // 필터 결과 0 → 필터 초기화(필터와 토글 모두), 필터 없이 0 → 지난 소셜링 보기 (spec 8.6 P01)
    return filtered ? (
      <EmptyState
        icon={SearchX}
        title="조건에 맞는 소셜링이 없어요"
        action={{ href: "/explore", label: "필터 초기화", replace: true }}
        tone="filter"
      />
    ) : (
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
