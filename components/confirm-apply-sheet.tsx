"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { NoticeBox } from "@/components/notice-box";
import { showToast } from "@/components/toast";
import { applyToSocialing } from "@/lib/actions/applications";

// DESIGN.md bottom-sheet/confirm-apply (O02 신청 확인, spec M7·8.4). 상세 아래 영역의 "신청하기"가 연다.
// 성공: 창이 닫히고 상세에 머문다. 아래 영역은 서버 액션이 새로 고친 7줄이 되고 "신청했어요 · 내 소셜링에서 보기"가 잠깐 뜬다.
// 누른 순간 신청할 수 없게 됨: 결과 창(dialog/result) "신청하지 못했어요" + 이유 → 확인 → 상세를 새로 고친다.
// 네트워크·서버 오류: 창을 연 채 안내 + "다시 시도". 로그인이 끊겼으면 서버 액션이 로그인 화면으로 보낸다.

export const JOIN_RESULT = {
  approval: "호스트가 승인하면 참여가 확정돼요",
  first_come: "신청하면 바로 참여가 확정돼요",
} as const;

export const PAYMENT_NOTICE = "결제 기능이 없는 데모입니다. 실제 서비스에서는 플랫폼 공통 환불 규칙을 따릅니다.";

type ConfirmApplySheetProps = {
  socialingId: number;
  title: string;
  /** 화면에 보일 글자로 바꾼 값 (서버에서 Asia/Seoul로) */
  startsAt: string;
  place: string;
  fee: string;
  joinType: keyof typeof JOIN_RESULT;
  approvalCriteria: string | null;
  /** 상세 아래 영역의 버튼 글자. 거절·신청 취소 뒤 9줄은 "다시 신청" */
  triggerLabel?: "신청하기" | "다시 신청";
};

export function ConfirmApplySheet(props: ConfirmApplySheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // 창과 결과 창을 닫으면 포커스를 돌려줄 버튼 (성공해서 버튼이 바뀌면 아래 영역의 첫 버튼으로)
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openSheet() {
    setRetry(false);
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof applyToSocialing>> | undefined;
      try {
        result = await applyToSocialing(props.socialingId);
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면으로 보낸 경우
      if (!result) return;

      if (result.ok) {
        setOpen(false);
        showToast({ message: "신청했어요", link: { href: "/me", label: "내 소셜링에서 보기" } });
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

  const criteria = props.joinType === "approval" ? props.approvalCriteria?.trim() : null;

  return (
    <>
      <Button ref={triggerRef} size="lg" className="w-full" onClick={openSheet}>
        {props.triggerLabel ?? "신청하기"}
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        returnFocusRef={triggerRef}
        title="신청할까요?"
        description={
          <>
            <span className="block">
              {props.title} · {props.startsAt}
            </span>
            <span className="block">
              {props.place} · {props.fee}
            </span>
          </>
        }
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
              돌아가기
            </Button>
            <Button size="lg" className="flex-2" onClick={submit} loading={pending}>
              {retry ? "다시 시도" : "신청하기"}
            </Button>
          </>
        }
      >
        {criteria ? <NoticeBox title="호스트 승인 기준">{criteria}</NoticeBox> : null}
        <div className="flex flex-col gap-xxs">
          <p className="flex gap-xs text-body-md text-text-secondary">
            <span aria-hidden>•</span>
            {JOIN_RESULT[props.joinType]}
          </p>
          <p className="text-body-sm text-text-muted">{PAYMENT_NOTICE}</p>
        </div>
        {retry ? (
          <p role="alert" className="text-body-sm text-danger">
            신청하지 못했어요. 연결을 확인하고 다시 시도해 주세요
          </p>
        ) : null}
      </BottomSheet>

      <Dialog
        open={failure !== null}
        onOpenChange={(next) => (next ? undefined : confirmFailure())}
        returnFocusRef={triggerRef}
        title="신청하지 못했어요"
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
