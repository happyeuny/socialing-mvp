import { CalendarSearch } from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull, ErrorStateInline } from "@/components/error-state";
import { HeroCard } from "@/components/hero-card";
import { ReviewCardCompact } from "@/components/review-card";
import { SectionHeader } from "@/components/section-header";
import { ShortcutBranch } from "@/components/shortcut-branch";
import { ShortcutCategory } from "@/components/shortcut-category";
import { SkeletonCardList, SkeletonHero } from "@/components/skeleton";
import { SocialingCardList } from "@/components/socialing-card";
import { listBranches, listCategories } from "@/lib/queries/catalog";
import { listRecentReviews } from "@/lib/queries/reviews";
import { getHomeSocialings } from "@/lib/queries/socialings";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";

// P00 홈 (spec M1, 8.2, 8.6, 8.9): 히어로 → 카테고리 바로가기 → 스터디지점 바로가기 → 곧 열리는 소셜링 → 최근 인증 후기.
// 모든 묶음은 규칙으로만 채우고 기준을 적는다. 묶음마다 따로 불러와서, 하나가 실패해도 그 자리에만 다시 시도가 뜬다(Q3).

type Simulated = { simulated: SimulatedState | null };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const simulated = readSimulatedState(await searchParams);

  return (
    <main className="flex flex-col gap-2xl px-page-x pt-lg pb-xl">
      <h1 className="sr-only">문화소셜링 홈</h1>
      {simulated === "error" ? (
        <ErrorStateFull />
      ) : (
        <>
          {simulated === "loading" ? (
            <SkeletonHero />
          ) : (
            <Suspense fallback={<SkeletonHero />}>
              <HeroSection simulated={simulated} />
            </Suspense>
          )}
          <Suspense>
            <CategorySection />
          </Suspense>
          <Suspense>
            <BranchSection />
          </Suspense>
          <section aria-labelledby="home-upcoming" className="flex flex-col gap-md">
            <SectionHeader
              id="home-upcoming"
              title="곧 열리는 소셜링"
              criteria="기준: 가까운 일시 순 · 맨 위 소셜링은 빼고 보여 줘요"
              moreHref="/explore"
            />
            {simulated === "loading" ? (
              <SkeletonCardList />
            ) : (
              <Suspense fallback={<SkeletonCardList />}>
                <UpcomingList simulated={simulated} />
              </Suspense>
            )}
          </section>
          {simulated !== "loading" && (
            <Suspense>
              <ReviewSection simulated={simulated} />
            </Suspense>
          )}
        </>
      )}
    </main>
  );
}

async function loadHomeSocialings(simulated: SimulatedState | null) {
  if (simulated === "empty") return { hero: null, upcoming: [] };
  try {
    return await getHomeSocialings();
  } catch (error) {
    console.error(error);
    return null;
  }
}

/** 히어로: 대상이 없으면 숨긴다. 불러오지 못하면 아래 "곧 열리는 소셜링" 자리에서 다시 시도 */
async function HeroSection({ simulated }: Simulated) {
  const data = await loadHomeSocialings(simulated);
  if (!data?.hero) return null;
  return (
    <section aria-label="지금 신청할 수 있는 가장 가까운 소셜링" className="flex flex-col gap-xs">
      <HeroCard socialing={data.hero} />
      <p className="text-body-sm text-text-secondary">
        기준: 지금 신청할 수 있는 소셜링 중 가장 가까운 일시 · 유료로 위에 올리는 소셜링은 없어요
      </p>
    </section>
  );
}

async function UpcomingList({ simulated }: Simulated) {
  const data = await loadHomeSocialings(simulated);
  if (!data) return <ErrorStateInline message="소셜링을 불러오지 못했어요" />;
  if (data.upcoming.length === 0) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="지금 신청할 수 있는 소셜링이 없어요"
        action={{ href: "/past", label: "지난 소셜링 보기" }}
      />
    );
  }
  return <SocialingCardList socialings={data.upcoming} />;
}

async function CategorySection() {
  let categories;
  try {
    categories = await listCategories();
  } catch (error) {
    console.error(error);
    return <ErrorStateInline message="카테고리를 불러오지 못했어요" />;
  }
  return (
    <section aria-labelledby="home-categories" className="flex flex-col gap-md">
      <SectionHeader id="home-categories" title="카테고리" />
      <ul className="flex justify-between">
        {categories.map((category) => (
          <li key={category.slug}>
            <ShortcutCategory slug={category.slug} name={category.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function BranchSection() {
  let branches;
  try {
    branches = await listBranches();
  } catch (error) {
    console.error(error);
    return <ErrorStateInline message="스터디지점을 불러오지 못했어요" />;
  }
  return (
    <section aria-labelledby="home-branches" className="flex flex-col gap-md">
      <SectionHeader id="home-branches" title="스터디지점에서 찾기" />
      <ul className="flex gap-xs">
        {branches.map((branch) => (
          <li key={branch.id} className="flex min-w-0 flex-1">
            <ShortcutBranch {...branch} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 최근 인증 후기 2개. 0개면 묶음을 숨긴다 */
async function ReviewSection({ simulated }: Simulated) {
  let reviews;
  if (simulated === "empty") return null;
  try {
    if (simulated === "partial") throw new Error("화면 상태 흉내: 후기 묶음만 실패");
    reviews = await listRecentReviews(2);
  } catch (error) {
    if (simulated !== "partial") console.error(error);
    reviews = null;
  }
  if (reviews?.length === 0) return null;

  return (
    <section aria-labelledby="home-reviews" className="flex flex-col gap-md">
      <SectionHeader
        id="home-reviews"
        title="최근 인증 후기"
        criteria="기준: 최신순 · 참여를 마친 사람만 쓸 수 있어요"
        moreHref="/reviews"
      />
      {reviews ? (
        <ul className="flex flex-col gap-sm">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCardCompact review={review} />
            </li>
          ))}
        </ul>
      ) : (
        <ErrorStateInline message="후기를 불러오지 못했어요" />
      )}
    </section>
  );
}
