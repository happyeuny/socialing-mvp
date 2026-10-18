import { CalendarSearch } from "lucide-react";
import Link from "next/link";
import { chipVariantOf } from "@/components/application-chip";
import { buttonVariants } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { ErrorStateFull, ErrorStateInline } from "@/components/error-state";
import { ParticipationRecordBox } from "@/components/participation-record";
import { SectionHeader } from "@/components/section-header";
import { SocialingCard } from "@/components/socialing-card";
import {
  getMyParticipationRecord,
  listMyAppliedSocialings,
  type MyAppliedSocialing,
  type ParticipationRecord,
  type SplitByPast,
} from "@/lib/queries/my-socialings";
import type { SimulatedState } from "@/lib/simulated-state";
import { cn } from "@/lib/utils";
import { rejectReasonLabel } from "@/lib/validation/reject";

// P06 신청한 소셜링 탭 (spec M11): 다가오는 소셜링(가까운 일시 순) → 지난 소셜링(최근 순).
// 카드마다 소셜링 상태 배지 + 내 신청 칩(socialing-card/my-application). 호스트 취소·취소(MS15 계산)로 보이는 소셜링은
// 배지 하나만(신청 상태는 그대로라 칩을 덮는다, spec 3.3). 확정 대기는 배지 + 칩.
// 후기를 쓸 수 있으면(참여 확정 + 종료 + 아직 안 씀, spec 3.4) "후기 쓰기"(P09는 MS5).
// 거절됐고 사유가 있으면 카드 아래 줄에 "거절 사유: …"(MS14 U10). 덧붙인 말은 상세에서만 보인다.
// 맨 위에 나만 보는 참여 기록(MS15 SH2). 기록만 실패하면 그 자리에만 다시 시도, 목록은 그대로(spec 8.6, Q3, `?_state=partial`).

/** 화면 상태 흉내 empty: 신청이 없는 새 계정의 기록 */
const EMPTY_RECORD: ParticipationRecord = { participatedCount: 0, lateCancelCount: 0, isNewMember: true, lateCancels: [] };

export async function AppliedSocialings({ simulated }: { simulated: SimulatedState | null }) {
  const [lists, record] = await Promise.allSettled([
    simulated === "error"
      ? Promise.reject(new Error("화면 상태 흉내: 오류"))
      : simulated === "empty"
        ? Promise.resolve<SplitByPast<MyAppliedSocialing>>({ upcoming: [], past: [] })
        : listMyAppliedSocialings(),
    simulated === "partial"
      ? Promise.reject(new Error("화면 상태 흉내: 참여 기록만 실패"))
      : simulated === "empty"
        ? Promise.resolve(EMPTY_RECORD)
        : getMyParticipationRecord(),
  ]);
  if (lists.status === "rejected") {
    if (simulated !== "error") console.error(lists.reason);
    return <ErrorStateFull />;
  }
  if (record.status === "rejected" && simulated !== "partial") console.error(record.reason);

  const recordBox =
    record.status === "fulfilled" ? (
      <ParticipationRecordBox record={record.value} />
    ) : (
      <ErrorStateInline message="참여 기록을 불러오지 못했어요" />
    );
  const { upcoming, past } = lists.value;

  return (
    <div className="flex flex-col gap-2xl">
      {recordBox}
      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={CalendarSearch}
          title="아직 신청한 소셜링이 없어요"
          action={{ href: "/explore", label: "탐색하기" }}
        />
      ) : (
        <>
          <Group id="applied-upcoming" title="다가오는 소셜링" criteria="가까운 일시 순" socialings={upcoming} />
          <Group id="applied-past" title="지난 소셜링" criteria="최근 순" socialings={past} />
        </>
      )}
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
              chip={isCanceled(socialing) ? undefined : chipVariantOf(socialing.application_status)}
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

/** 호스트 취소(직접·확정하지 않음)나 취소(최소 인원 미달)로 보임 → 신청 칩 없이 배지 하나 */
function isCanceled(socialing: MyAppliedSocialing) {
  return socialing.display_status === "host_canceled" || socialing.display_status === "auto_canceled";
}

/** spec 3.4 후기 작성 조건: 참여 확정 + 종료 + 아직 안 씀 (뷰가 준 값만 본다) */
function canWriteReview(socialing: MyAppliedSocialing) {
  return socialing.application_status === "accepted" && socialing.status === "completed" && !socialing.has_review;
}

/** 거절 칩이 보이는 카드(호스트 취소·취소가 아님)의 거절 사유 글. 사유가 없으면(MS14 전 거절) null */
function rejectReasonOf(socialing: MyAppliedSocialing): string | null {
  if (socialing.application_status !== "rejected" || isCanceled(socialing) || !socialing.reject_reason) {
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
