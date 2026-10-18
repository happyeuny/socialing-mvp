import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ApplicationChip, chipVariantOf } from "@/components/application-chip";
import { ApplyBarShell } from "@/components/apply-bar-shell";
import { Button, buttonVariants } from "@/components/button";
import { ConfirmApplySheet } from "@/components/confirm-apply-sheet";
import { ConfirmCancelApplicationSheet } from "@/components/confirm-cancel-application-sheet";
import { CountPill } from "@/components/count-pill";
import { formatAgeRange, formatDateTime, formatFee } from "@/lib/format";
import { refundPolicyText, showsRefundPolicy } from "@/lib/refund-policy";
import type { ApplyBarViewer } from "@/lib/queries/my-socialings";
import type { ClosedReason, SocialingDetail } from "@/lib/queries/socialings";
import { withNext } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { type RejectReason, rejectReasonLabel } from "@/lib/validation/reject";

// DESIGN.md C4 apply-bar: 상세 맨 아래에 붙는 영역. spec 8.4 표의 위에서부터 먼저 맞는 줄 하나만 보인다.
// 신청 가능 여부와 이유, 보는 사람의 신청·후기·승인 대기 건수는 DB(뷰)가 계산한 값을 그대로 쓴다.
// 1(호스트), 2(호스트 취소: 직접 / 확정 기한까지 확정하지 않음), 2-1(취소: 최소 인원 미달, MS15), 3·4(종료 뒤 후기),
// 5(참여 확정 · 확정 · 일시 지남), 7(신청함 → 신청 취소 O05), 8(승인 대기 · 일시 지남),
// 9·10(거절·신청 취소 뒤 다시 신청 / 불가, 거절이면 사유와 덧붙인 말), 11(비로그인 신청하기 → 로그인 → 상세 복귀),
// 12(신청하기 → O02), 13(신청 마감·정원 마감·지난 소셜링).
// 6줄(참여 확정 · 확정하지 않은 채 일시 지남)은 MS15에서 지웠다: 그런 소셜링은 모두 2줄이나 2-1줄에 먼저 맞는다(확정 기한 ≤ 일시).

const JOIN_GUIDE = {
  approval: "신청하면 호스트가 승인한 뒤 참여가 확정돼요",
  first_come: "신청하면 바로 참여가 확정돼요",
} as const;

// 10줄: 거절·신청 취소 뒤 다시 신청할 수 없는 이유. host_canceled는 2줄이 먼저 맞아 여기 오지 않는다 (13줄 이유를 "다시 신청할 수 없어요" 꼴로)
const REAPPLY_CLOSED: Record<Exclude<ClosedReason, "host_canceled">, string> = {
  full: "정원이 차서 다시 신청할 수 없어요",
  deadline: "신청 마감 일시가 지나 다시 신청할 수 없어요",
  started: "소셜링 일시가 지나 다시 신청할 수 없어요",
  not_open: "소셜링 일시가 지나 다시 신청할 수 없어요",
};

// 13줄 버튼 글자와 이유. 종료는 소셜링 일시 뒤에만 되므로 not_open은 실제로 started와 같다.
const CLOSED: Record<Exclude<ClosedReason, "host_canceled">, { button: string; reason: string }> = {
  full: { button: "정원 마감", reason: "참여 확정 인원이 정원에 찼어요" },
  deadline: { button: "신청 마감", reason: "신청 마감 일시가 지났어요" },
  started: { button: "지난 소셜링", reason: "소셜링 일시가 지났어요" },
  not_open: { button: "지난 소셜링", reason: "소셜링 일시가 지났어요" },
};

export function ApplyBar({ socialing, viewer }: { socialing: SocialingDetail; viewer: ApplyBarViewer }) {
  // 1줄: 호스트 본인은 언제나 관리하기 (호스트 취소한 소셜링도). 관리 화면 P11은 MS4
  if (viewer.kind === "host") {
    return (
      <Shell>
        <Guide>내가 연 소셜링이에요</Guide>
        <Link
          href={`/socialings/${socialing.id}/manage`}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
        >
          {viewer.pendingCount > 0 ? (
            <>
              관리하기 · 승인 대기{" "}
              <CountPill count={viewer.pendingCount} />
            </>
          ) : (
            "관리하기"
          )}
        </Link>
      </Shell>
    );
  }

  // 2줄: 호스트 취소 (신청자에게도 이 줄이 먼저). 직접 취소와 확정 기한까지 확정하지 않은 경우를 이유로 나눈다
  if (socialing.display_status === "host_canceled") {
    return (
      <Shell>
        <Button variant="danger" size="lg" className="w-full" disabled>
          호스트 취소
        </Button>
        <Guide>
          {socialing.cancel_reason === "not_confirmed"
            ? "호스트가 확정 기한까지 확정하지 않아 취소된 소셜링이에요"
            : "호스트가 취소한 소셜링이에요"}
        </Guide>
        <OtherSocialingsLink />
      </Shell>
    );
  }

  // 2-1줄: 취소 (최소 인원 미달, apply-bar/cancelled). 신청자에게도 이 줄이 먼저
  if (socialing.display_status === "auto_canceled") {
    return (
      <Shell>
        <Button variant="danger" size="lg" className="w-full" disabled>
          취소
        </Button>
        <Guide>최소 인원({socialing.min_participants}명)이 모이지 않아 취소된 소셜링이에요</Guide>
        <OtherSocialingsLink />
      </Shell>
    );
  }

  const application = viewer.kind === "member" ? viewer.application : null;

  if (application?.status === "accepted") {
    // 3·4줄: 참여 확정 + 종료 → 후기 쓰기(P09는 MS5) 또는 후기 작성 완료
    if (socialing.status === "completed") {
      if (application.hasReview) {
        return (
          <Shell>
            <StatusBox>
              <Check className="size-4 shrink-0" aria-hidden />
              후기 작성 완료
            </StatusBox>
          </Shell>
        );
      }
      return (
        <Shell>
          <Guide>소셜링이 끝났어요</Guide>
          <Link
            href={`/socialings/${socialing.id}/review`}
            className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
          >
            후기 쓰기
          </Link>
        </Shell>
      );
    }

    // 5줄: 참여 확정 + 소셜링 일시 지남. 여기 오는 소셜링은 확정뿐이라(모집중이면 2·2-1줄) 종료를 기다린다
    if (socialing.is_past) {
      return (
        <Shell>
          <StatusBox>
            <ApplicationChip variant="accepted" />
            소셜링 일시가 지났어요
          </StatusBox>
          <Guide>호스트가 종료하면 후기를 쓸 수 있어요</Guide>
        </Shell>
      );
    }
  }

  // 8줄: 승인 대기인 채로 소셜링 일시 지남 (저장된 상태는 그대로)
  if (application?.status === "pending" && socialing.is_past) {
    return (
      <Shell>
        <StatusBox>
          {/* 상자와 바탕이 같은 칩이라 surface 바탕으로 띄운다 (DESIGN.md C4 공통) */}
          <ApplicationChip variant="pending" className="bg-surface" />
          소셜링 일시가 지났어요
        </StatusBox>
        <Guide>호스트가 응답하지 않았어요</Guide>
      </Shell>
    );
  }

  // 7줄: 승인 대기·참여 확정, 소셜링 일시 전 → 신청 취소 O05.
  // 참여 확정 안내는 확정 소셜링이면 만나는 일시, 모집중·확정 대기면 확정 기한(MS15 U4)
  if (application && (application.status === "pending" || application.status === "accepted")) {
    return (
      <Shell>
        <ChipLine>
          <ApplicationChip variant={application.status} />
          {application.status === "pending"
            ? "호스트가 승인하면 참여 확정돼요"
            : socialing.display_status === "confirmed"
              ? `${formatDateTime(socialing.starts_at)}에 만나요`
              : `확정 기한(${formatDateTime(socialing.confirm_deadline_at)})까지 호스트가 확정하면 열려요`}
        </ChipLine>
        <ConfirmCancelApplicationSheet
          socialingId={socialing.id}
          applicationId={application.id}
          // 신청 마감이 지났으면(확정 대기·확정 + 신청 마감) 아무도 새로 신청할 수 없어 "자리를 채울 수 있어요"를 뺀다 (MS15)
          firstCome={
            socialing.join_type === "first_come" &&
            (socialing.closed_reason === null || socialing.closed_reason === "full")
          }
          status={application.status}
          startsAt={socialing.starts_at}
          fee={socialing.fee}
          autoCancelMin={application.cancelWouldAutoCancel ? socialing.min_participants : null}
          lateCancel={application.cancelWouldBeLate}
        />
      </Shell>
    );
  }

  // 9·10줄: 거절 또는 신청 취소 뒤. 지금 신청할 수 있으면 다시 신청(O02), 아니면 이유 + 다른 소셜링 보기
  if (application && (application.status === "rejected" || application.status === "canceled")) {
    const chip = <ApplicationChip variant={chipVariantOf(application.status)} />;
    const rejected =
      application.status === "rejected" && application.rejectReason ? (
        <RejectReasonLines reason={application.rejectReason} note={application.rejectNote} />
      ) : null;
    if (socialing.can_apply) {
      return (
        <Shell>
          {rejected}
          <ChipLine>
            {chip}
            자리가 남아 있어 다시 신청할 수 있어요
          </ChipLine>
          <ConfirmApplySheet triggerLabel="다시 신청" {...applySheetProps(socialing)} />
        </Shell>
      );
    }
    return (
      <Shell>
        {rejected}
        <ChipLine>
          {chip}
          {REAPPLY_CLOSED[(socialing.closed_reason ?? "started") as keyof typeof REAPPLY_CLOSED]}
        </ChipLine>
        <OtherSocialingsLink />
      </Shell>
    );
  }

  // 12줄: 로그인했고 신청 없음 → 신청하기 → 신청 확인 O02
  if (viewer.kind === "member" && socialing.can_apply) {
    return (
      <Shell>
        <Guide>{JOIN_GUIDE[socialing.join_type]}</Guide>
        <ConfirmApplySheet {...applySheetProps(socialing)} />
      </Shell>
    );
  }

  // 11줄: 비로그인 신청하기 → 로그인 → 상세로 돌아와 한 번 더 누른다 (자동 신청 없음, spec 8.9)
  if (socialing.can_apply) {
    return (
      <Shell>
        <Guide>{JOIN_GUIDE[socialing.join_type]}</Guide>
        <Link
          href={withNext("/login", `/socialings/${socialing.id}`)}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
        >
          신청하기
        </Link>
      </Shell>
    );
  }

  // 13줄: 신청 마감 / 정원 마감 / 지난 소셜링
  const closed = CLOSED[(socialing.closed_reason ?? "started") as keyof typeof CLOSED];
  return (
    <Shell>
      <Button variant="primary" size="lg" className="w-full" disabled>
        {closed.button}
      </Button>
      <Guide>{closed.reason}</Guide>
      <OtherSocialingsLink />
    </Shell>
  );
}

/** 신청 확인 O02에 넘길 요약 (일시는 Asia/Seoul로 바꾼 글자, 취소·환불 규칙은 상세를 그리는 순간 기준) */
function applySheetProps(socialing: SocialingDetail) {
  const now = new Date();
  return {
    socialingId: socialing.id,
    title: socialing.title,
    startsAt: formatDateTime(socialing.starts_at),
    place: socialing.venue_type === "branch" ? `스터디지점 ${socialing.venue_name}` : socialing.venue_name,
    fee: formatFee(socialing.fee),
    feeNote: socialing.fee_note?.trim() || null,
    joinType: socialing.join_type,
    approvalCriteria: socialing.approval_criteria,
    ageRange: socialing.join_type === "approval" ? formatAgeRange(socialing.min_age, socialing.max_age) : null,
    refundPolicy: showsRefundPolicy(socialing.fee, socialing.starts_at, now)
      ? refundPolicyText(socialing.starts_at, socialing.join_type, now)
      : null,
    openCondition: openConditionText(socialing),
  };
}

/**
 * O02 결과 안내 아래 한 줄 (MS15 U4, spec M7): 모집중 소셜링이면 열리는 조건. 확정 소셜링에는 없다.
 * 참가비가 0원이면 환불 문장은 뺀다. 신청할 수 있는 소셜링만 O02를 열므로 보이는 상태는 모집중·확정 둘 중 하나다
 */
export function openConditionText(
  socialing: Pick<SocialingDetail, "display_status" | "min_participants" | "confirm_deadline_at" | "fee">,
): string | null {
  if (socialing.display_status !== "recruiting") return null;
  const condition = `최소 ${socialing.min_participants}명이 모이고 확정 기한(${formatDateTime(socialing.confirm_deadline_at)})까지 호스트가 확정하면 열려요`;
  return socialing.fee > 0 ? `${condition}. 취소되면 전액 환불 기준이에요` : condition;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <ApplyBarShell label="신청">{children}</ApplyBarShell>;
}

/** 상태 상자: surface-muted 바탕, 모서리 lg, 버튼 자리를 채운다 */
function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-13 w-full flex-wrap items-center justify-center gap-xs rounded-lg bg-surface-muted px-md py-sm text-center text-body-lg text-text-primary">
      {children}
    </p>
  );
}

/** 신청 칩 + 안내 한 줄 */
function ChipLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-xs text-center text-body-sm text-text-secondary">
      {children}
    </p>
  );
}

/** 9·10줄 거절: "거절 사유: …" + 덧붙인 말(있으면, 따옴표 없이 회색 글). 신청자 본인만 본다 */
function RejectReasonLines({ reason, note }: { reason: RejectReason; note: string | null }) {
  return (
    <div className="flex w-full flex-col gap-xxs text-center">
      <p className="text-body-md break-keep text-text-primary">거절 사유: {rejectReasonLabel(reason)}</p>
      {note ? <p className="text-body-sm break-words whitespace-pre-line text-text-secondary">{note}</p> : null}
    </div>
  );
}

function Guide({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-body-sm text-text-secondary">{children}</p>;
}

function OtherSocialingsLink() {
  return (
    <Link href="/explore" className={cn(buttonVariants({ variant: "text-link", size: "inline" }), "-my-xs")}>
      다른 소셜링 보기
      <ChevronRight className="-ml-1 size-4" aria-hidden />
    </Link>
  );
}
