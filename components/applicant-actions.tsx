"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import { RadioRow } from "@/components/radio-row";
import { FieldMessage } from "@/components/text-field";
import { Textarea } from "@/components/textarea";
import { showToast } from "@/components/toast";
import { decideApplication, rejectApplication } from "@/lib/actions/manage";
import {
  REJECT_NOTE_MAX,
  REJECT_REASONS,
  rejectFieldErrors,
  rejectNoteLength,
  type RejectFieldErrors,
  type RejectReason,
} from "@/lib/validation/reject";

// DESIGN.md applicant-row/pending의 버튼 자리: sm secondary "거절" + sm primary "승인" (spec 8.8, screen-cases P11-12~17).
// 승인은 바로 처리하고, 거절은 O04(dialog/reject)를 거친다. 누를 수 있는지는 뷰가 계산한 값(canDecide, canApprove).
// 거절 창(U10, spec 8.8 O04 거절): 거절 사유 하나(필수, "연령 조건"은 연령 조건이 있을 때만) · 덧붙일 말 100자
// ("그 밖의 이유"면 필수) · 신청자에게 그대로 보인다는 안내 · "거절하면 되돌릴 수 없어요." · 돌아가기 / 거절.
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
  /** 소셜링에 연령 조건이 있음 → 거절 사유에 "연령 조건과 맞지 않아요" */
  hasAgeLimit: boolean;
  /** 막힌 이유 문구의 id */
  describedBy?: string;
};

type Failure = { title: string; reason: string };

const RETRY_MESSAGE = "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요";

export function ApplicantActions({
  socialingId,
  applicationId,
  nickname,
  canDecide,
  canApprove,
  hasAgeLimit,
  describedBy,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [retry, setRetry] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<RejectFieldErrors>({});
  const [pending, startTransition] = useTransition();
  // 창과 결과 창을 닫으면 포커스를 돌려줄 버튼 (처리되어 줄이 바뀌면 신청자 목록의 첫 버튼으로)
  const rejectRef = useRef<HTMLButtonElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reasonsRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const reasons = REJECT_REASONS.filter((item) => item.value !== "age" || hasAgeLimit);

  /** 거절 창의 칸 검사. 통과하면 고른 사유 */
  function checkReject(): RejectReason | null {
    const fieldErrors = rejectFieldErrors(reason, note);
    setErrors(fieldErrors);
    if (fieldErrors.reason) reasonsRef.current?.querySelector("input")?.focus();
    else if (fieldErrors.note) noteRef.current?.focus();
    return Object.keys(fieldErrors).length === 0 ? reason : null;
  }

  function decide(approve: boolean) {
    const rejectReason = approve ? null : checkReject();
    if (!approve && !rejectReason) return;
    if (approve) openerRef.current = approveRef.current;
    setRunning(approve ? "approve" : "reject");
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof decideApplication>> | undefined;
      try {
        result = rejectReason
          ? await rejectApplication(socialingId, applicationId, rejectReason, note)
          : await decideApplication(socialingId, applicationId, true);
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
    openerRef.current = rejectRef.current;
    setRetry(false);
    setReason(null);
    setNote("");
    setErrors({});
    setRejectOpen(true);
  }

  function confirmFailure() {
    setFailure(null);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-xs">
      <Button
        ref={rejectRef}
        variant="secondary"
        size="sm"
        onClick={openReject}
        disabled={!canDecide || pending}
        aria-describedby={canDecide ? undefined : describedBy}
      >
        거절
      </Button>
      <Button
        ref={approveRef}
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
        returnFocusRef={rejectRef}
        title={`${nickname} 님의 신청을 거절할까요?`}
        body={
          <>
            <div className="flex flex-col gap-xxs">
              <p id={`reject-reason-label-${applicationId}`} className="text-title-md text-text-primary">
                거절 사유
              </p>
              <div
                ref={reasonsRef}
                role="radiogroup"
                aria-labelledby={`reject-reason-label-${applicationId}`}
                aria-describedby={errors.reason ? "field-rejectReason-error" : undefined}
              >
                {reasons.map((item) => (
                  <RadioRow
                    key={item.value}
                    name="rejectReason"
                    value={item.value}
                    label={item.label}
                    checked={reason === item.value}
                    onSelect={() => {
                      setReason(item.value);
                      setErrors((current) => ({ ...current, reason: undefined, note: undefined }));
                    }}
                  />
                ))}
              </div>
              <FieldMessage id="field-rejectReason-error" error={errors.reason} />
            </div>
            <div className="flex flex-col gap-xxs">
              <Textarea
                ref={noteRef}
                name="rejectNote"
                label={reason === "other" ? "덧붙일 말" : "덧붙일 말 (선택)"}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setErrors((current) => ({ ...current, note: undefined }));
                }}
                counter={`${rejectNoteLength(note)} / ${REJECT_NOTE_MAX}`}
                invalid={Boolean(errors.note) || rejectNoteLength(note) > REJECT_NOTE_MAX}
                aria-describedby={
                  errors.note ? "field-rejectNote-error field-rejectNote-helper" : "field-rejectNote-helper"
                }
              />
              <FieldMessage id="field-rejectNote-error" error={errors.note} />
              <p id="field-rejectNote-helper" className="text-body-sm break-keep text-text-secondary">
                {nickname} 님에게 그대로 보여요. 외모나 성별을 이유로 쓰지 마세요
              </p>
            </div>
          </>
        }
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
