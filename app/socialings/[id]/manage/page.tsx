import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicantRow } from "@/components/applicant-row";
import { buttonVariants } from "@/components/button";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { ManageSummary } from "@/components/manage-summary";
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
      <ApplicantList applicants={applicants.filter((a) => inTab(a, tab))} empty={EMPTY[tab]} />
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

function ApplicantList({ applicants, empty }: { applicants: Applicant[]; empty: string }) {
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
        />
      ))}
    </ul>
  );
}
