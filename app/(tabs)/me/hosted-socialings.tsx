import { ChevronRight, CirclePlus, Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { CountPill } from "@/components/count-pill";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { SectionHeader } from "@/components/section-header";
import { SocialingCard } from "@/components/socialing-card";
import { listMyHostedSocialings, type MyHostedSocialing, type SplitByPast } from "@/lib/queries/my-socialings";
import type { SimulatedState } from "@/lib/simulated-state";
import { cn } from "@/lib/utils";

// P06 호스트인 소셜링 탭 (spec M11): 신청한 탭과 같은 순서(다가오는 → 지난).
// 카드를 누르면 관리(P11, MS4). 카드 아래 "승인 대기" 건수(있을 때)와 "소셜링 관리 ›"(socialing-card/host).
// "새 소셜링 만들기"는 등록(P07, MS7)으로 간다.

const NEW_SOCIALING = { href: "/socialings/new", label: "새 소셜링 만들기" };

export async function HostedSocialings({ simulated }: { simulated: SimulatedState | null }) {
  let lists: SplitByPast<MyHostedSocialing>;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    lists = simulated === "empty" ? { upcoming: [], past: [] } : await listMyHostedSocialings();
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return <ErrorStateFull />;
  }

  if (lists.upcoming.length === 0 && lists.past.length === 0) {
    return <EmptyState icon={CirclePlus} title="아직 연 소셜링이 없어요" action={NEW_SOCIALING} />;
  }

  return (
    <div className="flex flex-col gap-2xl">
      <Link href={NEW_SOCIALING.href} className={cn(buttonVariants({ variant: "secondary", size: "md" }), "w-full")}>
        <Plus className="size-4" aria-hidden />
        {NEW_SOCIALING.label}
      </Link>
      <Group id="hosted-upcoming" title="다가오는 소셜링" criteria="가까운 일시 순" socialings={lists.upcoming} />
      <Group id="hosted-past" title="지난 소셜링" criteria="최근 순" socialings={lists.past} />
    </div>
  );
}

function Group({
  id,
  title,
  criteria,
  socialings,
}: {
  id: string;
  title: string;
  criteria: string;
  socialings: MyHostedSocialing[];
}) {
  if (socialings.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-sm">
      <SectionHeader id={id} title={title} criteria={criteria} />
      <ul className="flex flex-col gap-sm">
        {socialings.map((socialing) => (
          <li key={socialing.id}>
            <SocialingCard
              socialing={socialing}
              href={`/socialings/${socialing.id}/manage`}
              footer={<HostFooter pendingCount={socialing.pending_count} />}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function HostFooter({ pendingCount }: { pendingCount: number }) {
  return (
    <>
      {pendingCount > 0 ? (
        <span className="flex items-center gap-xxs text-body-sm text-text-secondary">
          승인 대기 <CountPill count={pendingCount} />
        </span>
      ) : (
        <span />
      )}
      {/* 카드 전체가 관리로 가는 링크라 글자만 둔다 */}
      <span aria-hidden className="flex items-center text-body-md text-primary-strong">
        소셜링 관리
        <ChevronRight className="-ml-0.5 size-4" />
      </span>
    </>
  );
}
