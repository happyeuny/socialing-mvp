"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { showToast } from "@/components/toast";
import { decideApplication } from "@/lib/actions/manage";

// DESIGN.md applicant-row/pending의 버튼 자리: sm secondary "거절" + sm primary "승인" (spec 8.8, screen-cases P11-12~17).
// 승인은 바로 처리하고, 거절은 O04(dialog/confirm-danger)를 거친다. 누를 수 있는지는 뷰가 계산한 값(canDecide, canApprove).
// 성공: 서버 액션이 관리 화면을 새로 고쳐 탭·건수·요약이 바뀌고 "승인했어요" · "거절했어요"가 잠깐 뜬다.
// 그 사이 처리할 수 없게 됨: 결과 창 + 이유 → 확인 → 새로 고침. 네트워크 오류: 승인은 짧은 안내, 거절은 창을 연 채 다시 시도.

type Props = {
  socialingId: number;
  applicationId: number;
  nickname: string;
  /** 승인·거절 둘 다 (승인 대기 건, 소셜링 일시 전) */
  canDecide: boolean;
  /** 승인 (canDecide이고 정원이 남음) */
  canApprove: boolean;
  /** 막힌 이유 문구의 id */
  describedBy?: string;
};

type Failure = { title: string; reason: string };

const RETRY_MESSAGE = "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요";

export function ApplicantActions({ socialingId, applicationId, nickname, canDecide, canApprove, describedBy }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(approve: boolean) {
    setRunning(approve ? "approve" : "reject");
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof decideApplication>> | undefined;
      try {
        result = await decideApplication(socialingId, applicationId, approve);
      } catch {
        result = { ok: false, retry: true };
      }
      setRunning(null);
      // 로그인 화면이나 상세로 보낸 경우
      if (!result) return;

      if (result.ok) {
        setRejectOpen(false);
        showToast({ message: approve ? "승인했어요" : "거절했어요" });
      } else if ("reason" in result) {
        setRejectOpen(false);
        setFailure({ title: approve ? "승인하지 못했어요" : "거절하지 못했어요", reason: result.reason });
      } else if (approve) {
        showToast({ message: RETRY_MESSAGE });
      } else {
        setRetry(true);
      }
    });
  }

  function openReject() {
    setRetry(false);
    setRejectOpen(true);
  }

  function confirmFailure() {
    setFailure(null);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-xs">
      <Button
        variant="secondary"
        size="sm"
        onClick={openReject}
        disabled={!canDecide || pending}
        aria-describedby={canDecide ? undefined : describedBy}
      >
        거절
      </Button>
      <Button
        size="sm"
        onClick={() => decide(true)}
        disabled={!canApprove || pending}
        loading={running === "approve"}
        aria-describedby={canApprove ? undefined : describedBy}
      >
        승인
      </Button>

      <Dialog
        open={rejectOpen}
        onOpenChange={(next) => (pending ? undefined : setRejectOpen(next))}
        title={`${nickname} 님의 신청을 거절할까요?`}
        alert={retry ? RETRY_MESSAGE : null}
        footer={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setRejectOpen(false)}
              disabled={pending}
            >
              돌아가기
            </Button>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={() => decide(false)}
              loading={running === "reject"}
            >
              {retry ? "다시 시도" : "거절"}
            </Button>
          </>
        }
      >
        거절하면 되돌릴 수 없어요.
      </Dialog>

      <Dialog
        open={failure !== null}
        onOpenChange={(next) => (next ? undefined : confirmFailure())}
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
