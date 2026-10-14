import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicantActions } from "@/components/applicant-actions";
import { ApplicantRow } from "@/components/applicant-row";
import { buttonVariants } from "@/components/button";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { ManageStatusActions } from "@/components/manage-status-actions";
import { ManageSummary } from "@/components/manage-summary";
import { NoticeBox } from "@/components/notice-box";
import { ProgressSteps } from "@/components/progress-steps";
import { SegmentedWithCounts } from "@/components/segmented";
import { SkeletonManage } from "@/components/skeleton";
import { withNotice } from "@/lib/notices";
import { type Applicant, type ManagedSocialing, getManagePageData } from "@/lib/queries/manage";
import { getViewer } from "@/lib/queries/viewer";
import { withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";

// P11 소셜링 관리 (spec M8, 8.8, 8.6, 8.7). 그 소셜링의 호스트만 들어온다.
// 위에 요약 카드와 "상세 보기 ›", 소셜링 상태(진행 단계), 신청자 목록.
// 호스트 승인 방식은 탭 "승인 대기 · 참여 확정 · 거절·취소"(`?tab=accepted|closed`), 선착순은 참여 확정 목록만.
// 버튼을 보일지·막을지는 뷰(my_hosted_socialings)가 계산한 값을 쓴다.
// 상태 버튼(확정하기 · 종료하기 · 수정 · 호스트 취소)과 승인 대기 건의 승인·거절. 종료·호스트 취소 뒤에는 안내와 목록 보기만.

export const metadata: Metadata = { title: "소셜링 관리 · 문화소셜링" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ApplicantTab = "pending" | "accepted" | "closed";

function parseId(value: string): number | null {
  return /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null;
}

export default async function ManagePage({ params, searchParams }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const query = await searchParams;
  const simulated = readSimulatedState(query);
  const tab: ApplicantTab = query.tab === "accepted" || query.tab === "closed" ? query.tab : "pending";
  const managePath = `/socialings/${id}/manage`;

  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  if (!(await getViewer())) redirect(withNext("/login", managePath));

  if (simulated === "loading") {
    return (
      <>
        <HeaderSub title="소셜링 관리" />
        <SkeletonManage />
      </>
    );
  }

  let data: Awaited<ReturnType<typeof getManagePageData>>;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    data = await getManagePageData(id);
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return (
      <>
        <HeaderSub title="소셜링 관리" />
        <main className="px-page-x">
          <ErrorStateFull />
        </main>
      </>
    );
  }
  if (data.kind === "not-found") notFound();
  // 호스트가 아닌 사람 → 상세 + "호스트만 볼 수 있어요" (spec 8.7, screen-cases E05)
  if (data.kind === "not-host") redirect(withNotice(`/socialings/${id}`, "host-only"));

  const { socialing, applicants } = data;

  return (
    <>
      <HeaderSub
        title="소셜링 관리"
        action={
          <Link
            href={`/socialings/${id}`}
            className={`${buttonVariants({ variant: "text-link", size: "inline" })} shrink-0 gap-0`}
          >
            상세 보기
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <main className="flex flex-col gap-2xl px-page-x pt-lg pb-2xl">
        <ManageSummary socialing={socialing} />

        <section aria-labelledby="manage-status" className="flex flex-col gap-md">
          <h2 id="manage-status" className="text-title-lg text-text-primary">
            소셜링 상태
          </h2>
          <ProgressSteps status={socialing.status} />
          {socialing.status === "recruiting" || socialing.status === "confirmed" ? (
            <ManageStatusActions
              socialingId={socialing.id}
              status={socialing.status}
              canConfirm={socialing.can_confirm}
              confirmBlockedReason={socialing.confirm_blocked_reason}
              canComplete={socialing.can_complete}
              completeBlockedReason={socialing.complete_blocked_reason}
              canCancel={socialing.can_cancel}
              canEdit={socialing.can_edit}
            />
          ) : (
            // 종료·호스트 취소 뒤: 상태 버튼 대신 안내 (spec 8.8, screen-cases P11-05·06)
            <NoticeBox>
              {socialing.status === "completed"
                ? "종료한 소셜링이에요 · 참여자가 후기를 쓸 수 있어요"
                : "호스트 취소한 소셜링이에요"}
            </NoticeBox>
          )}
        </section>

        <section aria-labelledby="manage-applicants" className="flex flex-col gap-md">
          <h2 id="manage-applicants" className="text-title-lg text-text-primary">
            신청자
          </h2>
          {socialing.join_type === "approval" ? (
            <ApprovalApplicants socialing={socialing} applicants={applicants} tab={tab} managePath={managePath} />
          ) : (
            <FirstComeApplicants applicants={applicants} />
          )}
        </section>
      </main>
    </>
  );
}

const EMPTY: Record<ApplicantTab, string> = {
  pending: "승인을 기다리는 신청이 없어요",
  accepted: "아직 참여 확정자가 없어요",
  closed: "거절하거나 취소한 신청이 없어요",
};

function inTab(applicant: Applicant, tab: ApplicantTab) {
  if (tab === "closed") return applicant.status === "rejected" || applicant.status === "canceled";
  return applicant.status === tab;
}

const APPROVE_NOTE_ID = "approve-note";

/** 승인 대기 탭 아래 한 줄: 남은 자리, 또는 승인이 막힌 이유 (spec 8.8, screen-cases P11-12·13) */
function approveNote(socialing: ManagedSocialing): string | null {
  if (socialing.approve_blocked_reason === "started") return "소셜링 일시가 지나 승인할 수 없어요";
  if (socialing.approve_blocked_reason === "full") return "정원이 차서 승인할 수 없어요";
  if (socialing.can_approve) {
    return `남은 자리 ${socialing.capacity - socialing.accepted_count} · 정원이 차면 승인할 수 없어요`;
  }
  return null;
}

/** 호스트 승인 방식: 탭 3개 (screen-cases P11-07·09~11) */
function ApprovalApplicants({
  socialing,
  applicants,
  tab,
  managePath,
}: {
  socialing: ManagedSocialing;
  applicants: Applicant[];
  tab: ApplicantTab;
  managePath: string;
}) {
  const rows = applicants.filter((a) => inTab(a, tab));
  const note = tab === "pending" && rows.length > 0 ? approveNote(socialing) : null;
  // 종료·호스트 취소 뒤에는 approve_blocked_reason도 비어 있어 버튼 없이 보기만
  const decidable = socialing.can_decide || socialing.approve_blocked_reason !== null;
  return (
    <>
      <SegmentedWithCounts
        label="신청자 보기"
        active={tab}
        items={[
          { key: "pending", label: "승인 대기", count: socialing.pending_count, href: managePath },
          { key: "accepted", label: "참여 확정", count: socialing.accepted_count, href: `${managePath}?tab=accepted` },
          { key: "closed", label: "거절·취소", count: socialing.closed_count, href: `${managePath}?tab=closed` },
        ]}
      />
      <ApplicantList
        applicants={rows}
        empty={EMPTY[tab]}
        actions={
          decidable
            ? (applicant) => (
                <ApplicantActions
                  socialingId={socialing.id}
                  applicationId={applicant.application_id}
                  nickname={applicant.nickname}
                  canDecide={socialing.can_decide}
                  canApprove={socialing.can_approve}
                  describedBy={note ? APPROVE_NOTE_ID : undefined}
                />
              )
            : undefined
        }
      />
      {note && (
        <p id={APPROVE_NOTE_ID} className="text-body-sm break-keep text-text-secondary">
          {note}
        </p>
      )}
    </>
  );
}

/** 선착순: 신청하면 바로 참여 확정이라 참여 확정 목록만 (screen-cases P11-08·10) */
function FirstComeApplicants({ applicants }: { applicants: Applicant[] }) {
  return (
    <>
      <p className="-mt-xs text-body-sm text-text-secondary">선착순이라 신청하면 바로 참여 확정돼요</p>
      <ApplicantList applicants={applicants.filter((a) => a.status === "accepted")} empty={EMPTY.accepted} />
    </>
  );
}

function ApplicantList({
  applicants,
  empty,
  actions,
}: {
  applicants: Applicant[];
  empty: string;
  /** 승인 대기 행의 버튼 */
  actions?: (applicant: Applicant) => React.ReactNode;
}) {
  if (applicants.length === 0) {
    return <p className="py-xl text-center text-body-md text-text-secondary">{empty}</p>;
  }
  return (
    <ul aria-label="신청자 목록" className="flex flex-col">
      {applicants.map((applicant) => (
        <ApplicantRow
          key={applicant.application_id}
          nickname={applicant.nickname}
          appliedAt={applicant.applied_at}
          status={applicant.status}
          actions={applicant.status === "pending" ? actions?.(applicant) : undefined}
        />
      ))}
    </ul>
  );
}
