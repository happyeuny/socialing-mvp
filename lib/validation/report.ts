import { z } from "zod";

// 신고하기 시트 입력 (SH4b, spec M4·6장·8.6 P03). 시트와 서버 액션이 같은 규칙을 쓴다.
// DB 함수 create_report도 같은 범위를 다시 확인한다. 글자 수는 앞뒤 공백·줄바꿈을 뺀 글자 수다.

export const REPORT_NOTE_MAX = 300;

/** 신고 사유 (03 4.2 F2). 순서는 소셜링 규칙 1~3번 → 호스트의 원치 않는 연락 → 그 밖의 문제 */
export const REPORT_REASONS = [
  { value: "solicitation", label: "종교 활동이나 영업을 권유했어요" },
  { value: "extra_money", label: "앱에 적힌 금액 외에 돈을 요구했어요" },
  { value: "fake_participant", label: "스태프가 참가자인 척했어요" },
  { value: "unwanted_contact", label: "호스트가 원치 않는 연락이나 만남을 요구했어요" },
  { value: "other", label: "그 밖의 문제" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportFieldErrors = Partial<Record<"reason" | "note", string>>;

/** 앞뒤 공백·줄바꿈을 뺀 글자 수 (이모지도 한 글자) */
export function reportNoteLength(note: string): number {
  return Array.from(note.trim()).length;
}

/** 칸마다 첫 오류 하나 (spec 8.6 P03 신고) */
export function reportFieldErrors(reason: ReportReason | null, note: string): ReportFieldErrors {
  const errors: ReportFieldErrors = {};
  if (!reason) errors.reason = "신고 사유를 골라 주세요";
  const length = reportNoteLength(note);
  if (length > REPORT_NOTE_MAX) errors.note = `설명은 ${REPORT_NOTE_MAX}자까지 쓸 수 있어요`;
  else if (reason === "other" && length === 0) errors.note = "어떤 문제였는지 적어 주세요";
  return errors;
}

export const reportSchema = z
  .object({
    socialingId: z.number().int().positive(),
    reason: z.enum(REPORT_REASONS.map((item) => item.value) as [ReportReason, ...ReportReason[]]),
    note: z.string(),
  })
  .refine(({ reason, note }) => Object.keys(reportFieldErrors(reason, note)).length === 0);
