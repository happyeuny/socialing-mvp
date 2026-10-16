"use client";

import { useRef, useState, useTransition } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { NoticeBox } from "@/components/notice-box";
import { RadioRow } from "@/components/radio-row";
import { FieldMessage } from "@/components/text-field";
import { Textarea } from "@/components/textarea";
import { showToast } from "@/components/toast";
import { createReport } from "@/lib/actions/reports";
import {
  REPORT_NOTE_MAX,
  REPORT_REASONS,
  reportFieldErrors,
  reportNoteLength,
  type ReportFieldErrors,
  type ReportReason,
} from "@/lib/validation/report";

// 상세(P03) "신청 전에 확인해 주세요" 카드 맨 아래 신고 줄과 신고 시트 (SH4b, spec M4·8.6 P03, DESIGN bottom-sheet·radio-row).
// 줄: "이 소셜링에서 문제를 겪었나요?" + 신고하기(text-link). 접수했으면 "신고를 접수했어요"(버튼 없음).
// 시트: 사유 하나 · 설명(300자, 그 밖의 문제면 필수) · 접수만 된다는 안내 · 돌아가기 / 신고하기.
// 신고하기를 누르면 칸마다 이유를 보이고, 되면 시트를 닫고 "신고를 접수했어요". 그사이 이미 신고했어도 같다.
// 네트워크·서버 오류: 시트를 연 채 안내 + "다시 시도". 로그인이 끊겼으면 서버 액션이 로그인 화면으로 보낸다.

export const REPORT_QUESTION = "이 소셜링에서 문제를 겪었나요?";
export const REPORT_DONE = "신고를 접수했어요";

export function ReportLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-touch-min items-center justify-between gap-sm border-t border-border-divider pt-xs">
      {children}
    </div>
  );
}

export function ReportDone() {
  return <p className="text-body-md text-text-secondary">{REPORT_DONE}</p>;
}

export function ReportSheet({ socialingId }: { socialingId: number }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<ReportFieldErrors>({});
  const [retry, setRetry] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const firstReasonRef = useRef<HTMLDivElement>(null);

  function openSheet() {
    setRetry(false);
    setErrors({});
    setOpen(true);
  }

  function submit() {
    const fieldErrors = reportFieldErrors(reason, note);
    setErrors(fieldErrors);
    if (fieldErrors.reason) {
      firstReasonRef.current?.querySelector("input")?.focus();
      return;
    }
    if (fieldErrors.note || !reason) {
      noteRef.current?.focus();
      return;
    }
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createReport>> | undefined;
      try {
        result = await createReport(socialingId, reason, note);
      } catch {
        setRetry(true);
        return;
      }
      // 로그인 화면으로 보낸 경우
      if (!result) return;
      if (result.ok) {
        setOpen(false);
        setDone(true);
        showToast({ message: REPORT_DONE });
      } else {
        setRetry(true);
      }
    });
  }

  if (done) return <ReportDone />;

  const noteLength = reportNoteLength(note);
  return (
    <>
      <p className="text-body-md text-text-secondary">{REPORT_QUESTION}</p>
      <Button ref={triggerRef} variant="text-link" size="inline" className="px-xxs" onClick={openSheet}>
        신고하기
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        returnFocusRef={triggerRef}
        title="신고하기"
        footer={
          <>
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setOpen(false)} disabled={pending}>
              돌아가기
            </Button>
            <Button size="lg" className="flex-2" onClick={submit} loading={pending}>
              {retry ? "다시 시도" : "신고하기"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-xxs">
          <p id="report-reason-label" className="text-title-md text-text-primary">
            신고 사유
          </p>
          <div
            ref={firstReasonRef}
            role="radiogroup"
            aria-labelledby="report-reason-label"
            aria-describedby={errors.reason ? "field-reason-error" : undefined}
          >
            {REPORT_REASONS.map((item) => (
              <RadioRow
                key={item.value}
                name="reason"
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
          <FieldMessage id="field-reason-error" error={errors.reason} />
        </div>

        <div className="flex flex-col gap-xxs">
          <Textarea
            ref={noteRef}
            name="note"
            label={reason === "other" ? "설명" : "설명 (선택)"}
            placeholder="어떤 일이 있었는지 적어 주세요"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setErrors((current) => ({ ...current, note: undefined }));
            }}
            counter={`${noteLength} / ${REPORT_NOTE_MAX}`}
            invalid={Boolean(errors.note) || noteLength > REPORT_NOTE_MAX}
            aria-describedby={errors.note ? "field-note-error" : undefined}
          />
          <FieldMessage id="field-note-error" error={errors.note} />
        </div>

        <NoticeBox>신고는 접수만 돼요. 이 데모에는 처리하는 운영자가 없어 결과를 알려 드리지 않아요</NoticeBox>

        {retry ? (
          <p role="alert" className="text-body-sm text-danger">
            신고하지 못했어요. 연결을 확인하고 다시 시도해 주세요
          </p>
        ) : null}
      </BottomSheet>
    </>
  );
}
