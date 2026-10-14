import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ApplicationChip, chipVariantOf } from "@/components/application-chip";
import { Button, buttonVariants } from "@/components/button";
import { ConfirmApplySheet } from "@/components/confirm-apply-sheet";
import { ConfirmCancelApplicationSheet } from "@/components/confirm-cancel-application-sheet";
import { CountPill } from "@/components/count-pill";
import { formatDateTime, formatFee } from "@/lib/format";
import type { ApplyBarViewer } from "@/lib/queries/my-socialings";
import type { ClosedReason, SocialingDetail } from "@/lib/queries/socialings";
import { withNext } from "@/lib/routes";
import { cn } from "@/lib/utils";

// DESIGN.md C4 apply-bar: 상세 맨 아래에 붙는 영역. spec 8.4 표의 위에서부터 먼저 맞는 줄 하나만 보인다.
// 신청 가능 여부와 이유, 보는 사람의 신청·후기·승인 대기 건수는 DB(뷰)가 계산한 값을 그대로 쓴다.
// 1(호스트), 2(호스트 취소), 3·4(종료 뒤 후기), 5·6(참여 확정 · 일시 지남), 7(신청함 → 신청 취소 O05),
// 8(승인 대기 · 일시 지남), 9·10(거절·신청 취소 뒤 다시 신청 / 불가), 11(비로그인 신청하기 → 로그인 → 상세 복귀),
// 12(신청하기 → O02), 13(신청 마감·정원 마감·지난 소셜링).

const JOIN_GUIDE = {
  approval: "신청하면 호스트가 승인한 뒤 참여가 확정돼요",
  first_come: "신청하면 바로 참여가 확정돼요",
} as const;

// 10줄: 거절·신청 취소 뒤 다시 신청할 수 없는 이유 (13줄 이유를 "다시 신청할 수 없어요" 꼴로)
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

  // 2줄: 호스트 취소 (신청자에게도 이 줄이 먼저)
  if (socialing.closed_reason === "host_canceled") {
    return (
      <Shell>
        <Button variant="danger" size="lg" className="w-full" disabled>
          호스트 취소
        </Button>
        <Guide>호스트가 취소한 소셜링이에요</Guide>
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

    // 5·6줄: 참여 확정 + 소셜링 일시 지남. 확정이면 종료를 기다리고, 모집중 그대로면 후기를 쓸 수 없다
    if (socialing.is_past) {
      return (
        <Shell>
          <StatusBox>
            <ApplicationChip variant="accepted" />
            소셜링 일시가 지났어요
          </StatusBox>
          <Guide>
            {socialing.status === "confirmed"
              ? "호스트가 종료하면 후기를 쓸 수 있어요"
              : "호스트가 확정하지 않은 소셜링이라 후기를 쓸 수 없어요"}
          </Guide>
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

  // 7줄: 승인 대기·참여 확정, 소셜링 일시 전 → 신청 취소 O05
  if (application && (application.status === "pending" || application.status === "accepted")) {
    return (
      <Shell>
        <ChipLine>
          <ApplicationChip variant={application.status} />
          {application.status === "accepted"
            ? `${formatDateTime(socialing.starts_at)}에 만나요`
            : "호스트가 승인하면 참여 확정돼요"}
        </ChipLine>
        <ConfirmCancelApplicationSheet
          socialingId={socialing.id}
          applicationId={application.id}
          firstCome={socialing.join_type === "first_come"}
        />
      </Shell>
    );
  }

  // 9·10줄: 거절 또는 신청 취소 뒤. 지금 신청할 수 있으면 다시 신청(O02), 아니면 이유 + 다른 소셜링 보기
  if (application && (application.status === "rejected" || application.status === "canceled")) {
    const chip = <ApplicationChip variant={chipVariantOf(application.status)} />;
    if (socialing.can_apply) {
      return (
        <Shell>
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

/** 신청 확인 O02에 넘길 요약 (일시는 Asia/Seoul로 바꾼 글자) */
function applySheetProps(socialing: SocialingDetail) {
  return {
    socialingId: socialing.id,
    title: socialing.title,
    startsAt: formatDateTime(socialing.starts_at),
    place: socialing.venue_type === "branch" ? `스터디지점 ${socialing.venue_name}` : socialing.venue_name,
    fee: formatFee(socialing.fee),
    joinType: socialing.join_type,
    approvalCriteria: socialing.approval_criteria,
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="신청"
      data-toast-anchor
      className="sticky bottom-0 z-10 flex flex-col items-center gap-xs border-t border-border-default bg-surface px-md pt-sm pb-[calc(12px+env(safe-area-inset-bottom))] shadow-up"
    >
      {children}
    </section>
  );
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
