import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { ReviewSummary } from "@/components/review-summary";
import { SkeletonReviewWrite } from "@/components/skeleton";
import { type NoticeKey, withNotice } from "@/lib/notices";
import { type ApplyBarViewer, getApplyBarViewer } from "@/lib/queries/my-socialings";
import { type SocialingDetail, getSocialing } from "@/lib/queries/socialings";
import { getViewer } from "@/lib/queries/viewer";
import { withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { ReviewForm } from "./review-form";

// P09 후기 쓰기 (spec M9, 3.4, 8.6, 8.7). 참여 확정자가 호스트가 종료한 소셜링에 한 번만 쓴다.
// 조건이 안 맞으면 상세로 보내고 이유를 짧은 안내로 보인다. 올릴 때 create_review가 같은 조건을 다시 확인한다.

export const metadata: Metadata = { title: "후기 쓰기 · 문화소셜링" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseId(value: string): number | null {
  return /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null;
}

/** 작성 조건(spec 3.4)이 안 맞는 이유. 참여 확정자 아님(호스트 포함) → 종료 전 → 이미 씀 순서 (screen-cases E07~09) */
function blockedNotice(socialing: SocialingDetail, viewer: ApplyBarViewer): NoticeKey | null {
  const application = viewer.kind === "member" ? viewer.application : null;
  if (application?.status !== "accepted") return "review-not-participant";
  if (socialing.status !== "completed") return "review-not-completed";
  if (application.hasReview) return "review-done";
  return null;
}

export default async function ReviewWritePage({ params, searchParams }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const simulated = readSimulatedState(await searchParams);
  const reviewPath = `/socialings/${id}/review`;

  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  const viewer = await getViewer();
  if (!viewer) redirect(withNext("/login", reviewPath));

  if (simulated === "loading") {
    return (
      <>
        <HeaderSub title="후기 쓰기" />
        <SkeletonReviewWrite />
      </>
    );
  }

  let socialing: SocialingDetail | null;
  let applyViewer: ApplyBarViewer;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    [socialing, applyViewer] = await Promise.all([getSocialing(id), getApplyBarViewer(id)]);
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return (
      <>
        <HeaderSub title="후기 쓰기" />
        <main className="px-page-x">
          <ErrorStateFull />
        </main>
      </>
    );
  }
  if (!socialing) notFound();
  const notice = blockedNotice(socialing, applyViewer);
  if (notice) redirect(withNotice(`/socialings/${id}`, notice));

  return (
    <>
      <HeaderSub title="후기 쓰기" />
      <main>
        <ReviewForm socialingId={id} userId={viewer.id} summary={<ReviewSummary socialing={socialing} />} />
      </main>
    </>
  );
}
