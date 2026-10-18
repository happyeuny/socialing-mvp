"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { showToast } from "@/components/toast";
import { cancelApplication } from "@/lib/actions/applications";
import { cancelRefundNotice, showsRefundPolicy } from "@/lib/refund-policy";

// DESIGN.md bottom-sheet/confirm-cancel-application (O05 신청 취소 확인, spec M7·8.4). 상세 7줄의 "신청 취소"가 연다.
// 선착순이면 "취소하면 다른 사람이 자리를 채울 수 있어요."를 함께 보인다.
// 성공: 창이 닫히고 아래 영역은 서버 액션이 새로 고친 9·10줄이 되며 "신청을 취소했어요"가 잠깐 뜬다.
// 그 사이 취소할 수 없게 됨(소셜링 일시 지남 등): 결과 창 + 이유 → 확인 → 새로 고침. 네트워크 오류: 창을 연 채 다시 시도.
// 참가비가 있으면 그 아래 "지금 취소하면 … 환불 기준이에요" 한 줄(spec 8.2 O05, 6장 환불 기준). 창을 여는 순간으로 계산한다.
// MS15(04 3.5): 맨 위에 DB가 계산한 두 줄. 확정 대기에서 내가 취소하면 최소 인원보다 적어질 때 "…소셜링이 취소돼요",
// 신청 마감 뒤 참여 확정 취소면 "…늦은 취소로 남아요(나만 봐요)". 둘 다면 두 줄, 위 줄이 먼저.

type Props = {
  socialingId: number;
  applicationId: number;
  /** 선착순이고 아직 신청을 받는 중(신청 마감 전)이라 취소하면 다른 사람이 자리를 채울 수 있음 */
  firstCome: boolean;
  status: "pending" | "accepted";
  startsAt: string;
  fee: number;
  /** 확정 대기에서 내가 취소하면 소셜링이 취소됨 → 그 소셜링의 최소 인원. 아니면 null (my_applied_socialings.cancel_would_auto_cancel) */
  autoCancelMin: number | null;
  /** 신청 마감 뒤 참여 확정 취소 = 늦은 취소 (my_applied_socialings.cancel_would_be_late) */
  lateCancel: boolean;
};

export function ConfirmCancelApplicationSheet({
  socialingId,
  applicationId,
  firstCome,
  status,
  startsAt,
  fee,
  autoCancelMin,
  lateCancel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  // 창과 결과 창을 닫으면 포커스를 돌려줄 버튼 (성공해서 버튼이 바뀌면 아래 영역의 첫 버튼으로)
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openSheet() {
    const now = new Date();
    setRefundNotice(showsRefundPolicy(fee, startsAt, now) ? cancelRefundNotice(status, startsAt, now) : null);
    setRetry(false);
    setOpen(true);
  }

  const lines = [
    autoCancelMin !== null ? `지금 취소하면 최소 인원(${autoCancelMin}명)보다 적어져 소셜링이 취소돼요` : null,
    lateCancel ? "지금 취소하면 내 참여 기록에 늦은 취소로 남아요(나만 봐요)" : null,
    firstCome ? "취소하면 다른 사람이 자리를 채울 수 있어요." : null,
    refundNotice,
  ].filter((line): line is string => line !== null);
  const description =
    lines.length > 0 ? (
      <>
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </>
    ) : undefined;

  function submit() {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof cancelApplication>> | undefined;
      try {
        result = await cancelApplication(socialingId, applicationId);
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면으로 보낸 경우
      if (!result) return;

      if (result.ok) {
        setOpen(false);
        showToast({ message: "신청을 취소했어요" });
      } else if ("reason" in result) {
        setOpen(false);
        setFailure(result.reason);
      } else {
        setRetry(true);
      }
    });
  }

  function confirmFailure() {
    setFailure(null);
    router.refresh();
  }

  return (
    <>
      <Button ref={triggerRef} variant="secondary" size="lg" className="w-full" onClick={openSheet}>
        신청 취소
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        returnFocusRef={triggerRef}
        title="신청을 취소할까요?"
        description={description}
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
              돌아가기
            </Button>
            <Button variant="danger" size="lg" className="flex-1" onClick={submit} loading={pending}>
              {retry ? "다시 시도" : "신청 취소"}
            </Button>
          </>
        }
      >
        {retry ? (
          <p role="alert" className="text-body-sm text-danger">
            신청을 취소하지 못했어요. 연결을 확인하고 다시 시도해 주세요
          </p>
        ) : null}
      </BottomSheet>

      <Dialog
        open={failure !== null}
        onOpenChange={(next) => (next ? undefined : confirmFailure())}
        returnFocusRef={triggerRef}
        title="신청을 취소하지 못했어요"
        footer={
          <Button size="lg" className="w-full" onClick={confirmFailure}>
            확인
          </Button>
        }
      >
        {failure}
      </Dialog>
    </>
  );
}
