"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { showToast } from "@/components/toast";
import { cancelApplication } from "@/lib/actions/applications";

// DESIGN.md bottom-sheet/confirm-cancel-application (O05 신청 취소 확인, spec M7·8.4). 상세 7줄의 "신청 취소"가 연다.
// 선착순이면 "취소하면 다른 사람이 자리를 채울 수 있어요."를 함께 보인다.
// 성공: 창이 닫히고 아래 영역은 서버 액션이 새로 고친 9·10줄이 되며 "신청을 취소했어요"가 잠깐 뜬다.
// 그 사이 취소할 수 없게 됨(소셜링 일시 지남 등): 결과 창 + 이유 → 확인 → 새로 고침. 네트워크 오류: 창을 연 채 다시 시도.

type Props = { socialingId: number; applicationId: number; firstCome: boolean };

export function ConfirmCancelApplicationSheet({ socialingId, applicationId, firstCome }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setRetry(false);
    setOpen(true);
  }

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
      <Button variant="secondary" size="lg" className="w-full" onClick={openSheet}>
        신청 취소
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        title="신청을 취소할까요?"
        description={firstCome ? "취소하면 다른 사람이 자리를 채울 수 있어요." : undefined}
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
