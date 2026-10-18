"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { showToast } from "@/components/toast";
import { cancelSocialing, completeSocialing, confirmSocialing } from "@/lib/actions/manage";
import type { CompleteBlockedReason, ConfirmBlockedReason } from "@/lib/queries/manage";
import { cn } from "@/lib/utils";

// DESIGN.md manage-status-actions. 소셜링 관리(P11) "소셜링 상태"의 상태 버튼 (spec 8.8, screen-cases P11-01~04·18~20).
// 모집중: primary "확정하기" + 설명, secondary "수정" · danger "호스트 취소", 막힌 "종료하기" + 이유 (시안).
// 확정: primary "종료하기"(일시 전이면 막힘 + 이유), "수정" · "호스트 취소".
// 누를 수 있는지와 막힌 이유는 뷰가 계산한 값. 셋 다 O04(dialog/confirm, 호스트 취소는 confirm-danger)를 거친다.
// 성공: 서버 액션이 화면을 새로 고쳐 진행 단계·요약이 바뀌고 짧은 안내. 그 사이 처리할 수 없게 됨: 결과 창 + 이유 → 새로 고침.
// 네트워크 오류: 창을 연 채 안내 + 다시 시도.

type HostAction = "confirm" | "complete" | "cancel";

type Props = {
  socialingId: number;
  status: "recruiting" | "confirmed";
  canConfirm: boolean;
  confirmBlockedReason: ConfirmBlockedReason | null;
  canComplete: boolean;
  completeBlockedReason: CompleteBlockedReason | null;
  canCancel: boolean;
  canEdit: boolean;
};

const ACTIONS: Record<
  HostAction,
  {
    run: (socialingId: number) => ReturnType<typeof confirmSocialing>;
    title: string;
    body: string;
    label: string;
    danger?: boolean;
    success: string;
    failure: string;
  }
> = {
  confirm: {
    run: confirmSocialing,
    title: "확정할까요?",
    body: "확정하면 되돌릴 수 없어요. 소셜링 상태가 '확정'으로 바뀌어 모두에게 보여요.",
    label: "확정하기",
    success: "확정했어요",
    failure: "확정하지 못했어요",
  },
  complete: {
    run: completeSocialing,
    title: "종료할까요?",
    body: "종료하면 되돌릴 수 없어요. 참여 확정자가 인증 후기를 쓸 수 있게 돼요.",
    label: "종료하기",
    success: "종료했어요 · 참여자가 이제 후기를 쓸 수 있어요",
    failure: "종료하지 못했어요",
  },
  cancel: {
    run: cancelSocialing,
    title: "호스트 취소할까요?",
    body: "취소하면 되돌릴 수 없어요. 참여 확정·승인 대기인 사람이 있으면 호스트 기록의 호스트 취소 수에 들어가요.",
    label: "호스트 취소",
    danger: true,
    success: "호스트 취소했어요",
    failure: "호스트 취소하지 못했어요",
  },
};

const CONFIRM_HELP = '확정하면 소셜링 상태가 "확정"으로 바뀌어 모두에게 보여요. 소셜링 일시 전까지 할 수 있어요.';
const CONFIRM_BLOCKED: Record<ConfirmBlockedReason, string> = {
  started: "소셜링 일시가 지나 확정할 수 없어요",
  // MS15 U4: 인원 수와 계산 취소 화면은 관리 PR에서 (04 3.6)
  min_not_met: "최소 인원이 모여야 확정할 수 있어요",
  canceled: "이미 취소된 소셜링이에요",
};
const COMPLETE_BLOCKED: Record<CompleteBlockedReason, string> = {
  confirm_first: "확정한 뒤 소셜링 일시가 지나야 종료할 수 있어요",
  not_confirmed: "확정하지 않은 소셜링은 종료할 수 없어요",
  not_started: "소셜링 일시가 지나야 종료할 수 있어요",
};
const RETRY_MESSAGE = "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요";

type Failure = { title: string; reason: string };

export function ManageStatusActions(props: Props) {
  const { socialingId, status, canConfirm, confirmBlockedReason, canComplete, completeBlockedReason } = props;
  const router = useRouter();
  const [open, setOpen] = useState<HostAction | null>(null);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();
  const action = open ? ACTIONS[open] : null;
  // 창과 결과 창을 닫으면 포커스를 돌려줄 버튼 (성공해서 버튼이 사라지면 "소셜링 상태"의 첫 버튼으로)
  const openerRef = useRef<HTMLElement | null>(null);

  function openDialog(next: HostAction, opener: HTMLElement) {
    openerRef.current = opener;
    setRetry(false);
    setOpen(next);
  }

  function submit() {
    if (!open) return;
    const current = ACTIONS[open];
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof current.run>> | undefined;
      try {
        result = await current.run(socialingId);
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면이나 상세로 보낸 경우
      if (!result) return;

      if (result.ok) {
        setOpen(null);
        showToast({ message: current.success });
      } else if ("reason" in result) {
        setOpen(null);
        setFailure({ title: current.failure, reason: result.reason });
      } else {
        setRetry(true);
      }
    });
  }

  function confirmFailure() {
    setFailure(null);
    router.refresh();
  }

  const completeNote = completeBlockedReason ? COMPLETE_BLOCKED[completeBlockedReason] : null;
  const completeButton = (
    <ActionWithNote noteId="complete-note" note={completeNote}>
      <Button
        size="lg"
        className="w-full"
        disabled={!canComplete}
        aria-describedby={completeNote ? "complete-note" : undefined}
        onClick={(event) => openDialog("complete", event.currentTarget)}
      >
        종료하기
      </Button>
    </ActionWithNote>
  );

  return (
    <div className="flex flex-col gap-md">
      {status === "recruiting" && (
        <ActionWithNote
          noteId="confirm-note"
          note={confirmBlockedReason ? CONFIRM_BLOCKED[confirmBlockedReason] : CONFIRM_HELP}
        >
          <Button
            size="lg"
            className="w-full"
            disabled={!canConfirm}
            aria-describedby="confirm-note"
            onClick={(event) => openDialog("confirm", event.currentTarget)}
          >
            확정하기
          </Button>
        </ActionWithNote>
      )}
      {status === "confirmed" && completeButton}

      {(props.canEdit || props.canCancel) && (
        <div className="flex gap-xs">
          {props.canEdit && (
            // 소셜링 수정(P08). 저장하면 이 화면으로 돌아와 "저장했어요"
            <Link
              href={`/socialings/${socialingId}/edit`}
              className={cn(buttonVariants({ variant: "secondary", size: "md" }), "flex-1")}
            >
              수정
            </Link>
          )}
          {props.canCancel && (
            <Button
              variant="danger"
              size="md"
              className="flex-1"
              onClick={(event) => openDialog("cancel", event.currentTarget)}
            >
              호스트 취소
            </Button>
          )}
        </div>
      )}

      {/* 모집중일 때 종료하기는 막힌 채 이유와 함께 보인다 (시안) */}
      {status === "recruiting" && completeButton}

      <Dialog
        open={open !== null}
        onOpenChange={(next) => (pending || next ? undefined : setOpen(null))}
        returnFocusRef={openerRef}
        title={action?.title ?? ""}
        alert={retry ? RETRY_MESSAGE : null}
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setOpen(null)} disabled={pending}>
              돌아가기
            </Button>
            <Button
              variant={action?.danger ? "danger" : "primary"}
              size="lg"
              className="flex-1"
              onClick={submit}
              loading={pending}
            >
              {retry ? "다시 시도" : action?.label}
            </Button>
          </>
        }
      >
        {action?.body}
      </Dialog>

      <Dialog
        open={failure !== null}
        onOpenChange={(next) => (next ? undefined : confirmFailure())}
        returnFocusRef={openerRef}
        title={failure?.title ?? ""}
        footer={
          <Button size="lg" className="w-full" onClick={confirmFailure}>
            확인
          </Button>
        }
      >
        {failure?.reason}
      </Dialog>
    </div>
  );
}

/** 큰 버튼과 그 아래 설명·막힌 이유 한 줄 */
function ActionWithNote({
  noteId,
  note,
  children,
}: {
  noteId: string;
  note: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      {children}
      {note && (
        <p id={noteId} className="text-body-sm break-keep text-text-secondary">
          {note}
        </p>
      )}
    </div>
  );
}
