import { CalendarSearch } from "lucide-react";
import Link from "next/link";
import { chipVariantOf } from "@/components/application-chip";
import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull } from "@/components/error-state";
import { SectionHeader } from "@/components/section-header";
import { SocialingCard } from "@/components/socialing-card";
import { listMyAppliedSocialings, type MyAppliedSocialing, type SplitByPast } from "@/lib/queries/my-socialings";
import type { SimulatedState } from "@/lib/simulated-state";
import { cn } from "@/lib/utils";
import { rejectReasonLabel } from "@/lib/validation/reject";

// P06 신청한 소셜링 탭 (spec M11): 다가오는 소셜링(가까운 일시 순) → 지난 소셜링(최근 순).
// 카드마다 소셜링 상태 배지 + 내 신청 칩(socialing-card/my-application). 호스트 취소된 소셜링은 배지 "호스트 취소" 하나만.
// 후기를 쓸 수 있으면(참여 확정 + 종료 + 아직 안 씀, spec 3.4) "후기 쓰기"(P09는 MS5).
// 거절됐고 사유가 있으면 카드 아래 줄에 "거절 사유: …"(MS14 U10). 덧붙인 말은 상세에서만 보인다.

export async function AppliedSocialings({ simulated }: { simulated: SimulatedState | null }) {
  let lists: SplitByPast<MyAppliedSocialing>;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    lists = simulated === "empty" ? { upcoming: [], past: [] } : await listMyAppliedSocialings();
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return <ErrorStateFull />;
  }

  if (lists.upcoming.length === 0 && lists.past.length === 0) {
    return (
      <EmptyState
        icon={CalendarSearch}
        title="아직 신청한 소셜링이 없어요"
        action={{ href: "/explore", label: "탐색하기" }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2xl">
      <Group id="applied-upcoming" title="다가오는 소셜링" criteria="가까운 일시 순" socialings={lists.upcoming} />
      <Group id="applied-past" title="지난 소셜링" criteria="최근 순" socialings={lists.past} />
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
  socialings: MyAppliedSocialing[];
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
              chip={socialing.status === "canceled" ? undefined : chipVariantOf(socialing.application_status)}
              footer={
                canWriteReview(socialing) ? (
                  <ReviewLink id={socialing.id} />
                ) : rejectReasonOf(socialing) ? (
                  <p className="text-body-sm break-keep text-text-secondary">거절 사유: {rejectReasonOf(socialing)}</p>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** spec 3.4 후기 작성 조건: 참여 확정 + 종료 + 아직 안 씀 (뷰가 준 값만 본다) */
function canWriteReview(socialing: MyAppliedSocialing) {
  return socialing.application_status === "accepted" && socialing.status === "completed" && !socialing.has_review;
}

/** 거절 칩이 보이는 카드(호스트 취소가 아님)의 거절 사유 글. 사유가 없으면(MS14 전 거절) null */
function rejectReasonOf(socialing: MyAppliedSocialing): string | null {
  if (socialing.application_status !== "rejected" || socialing.status === "canceled" || !socialing.reject_reason) {
    return null;
  }
  return rejectReasonLabel(socialing.reject_reason);
}

function ReviewLink({ id }: { id: number }) {
  return (
    <Link
      href={`/socialings/${id}/review`}
      className={cn(buttonVariants({ variant: "primary", size: "sm" }), "relative z-10 ml-auto")}
    >
      후기 쓰기
    </Link>
  );
}
