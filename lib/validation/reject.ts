import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

// 거절 창(O04 거절) 입력 (U10, spec 6장·8.8 O04). 창과 서버 액션이 같은 규칙을 쓴다.
// DB 함수 reject_application도 같은 범위를 다시 확인한다. 글자 수는 앞뒤 공백·줄바꿈을 뺀 글자 수다.

export const REJECT_NOTE_MAX = 100;

export type RejectReason = Database["public"]["Enums"]["reject_reason"];

/** 거절 사유 (03 7.2 F3). 신청자에게 이 글 그대로 보인다. "연령 조건"은 연령 조건이 있는 소셜링에서만 고른다 */
export const REJECT_REASONS: readonly { value: RejectReason; label: string }[] = [
  { value: "criteria", label: "승인 기준과 맞지 않아요" },
  { value: "age", label: "연령 조건과 맞지 않아요" },
  { value: "full", label: "정원이 다 찼어요" },
  { value: "host", label: "호스트 사정으로 함께하기 어려워요" },
  { value: "other", label: "그 밖의 이유" },
];

const REJECT_REASON_VALUES = ["criteria", "age", "full", "host", "other"] as const satisfies readonly RejectReason[];

/** 신청자·호스트 화면의 "거절 사유: …" 글 */
export function rejectReasonLabel(reason: RejectReason): string {
  return REJECT_REASONS.find((item) => item.value === reason)?.label ?? "그 밖의 이유";
}

export type RejectFieldErrors = Partial<Record<"reason" | "note", string>>;

/** 앞뒤 공백·줄바꿈을 뺀 글자 수 (이모지도 한 글자) */
export function rejectNoteLength(note: string): number {
  return Array.from(note.trim()).length;
}

/** 칸마다 첫 오류 하나 (spec 8.8 O04 거절) */
export function rejectFieldErrors(reason: RejectReason | null, note: string): RejectFieldErrors {
  const errors: RejectFieldErrors = {};
  if (!reason) errors.reason = "거절 사유를 골라 주세요";
  const length = rejectNoteLength(note);
  if (length > REJECT_NOTE_MAX) errors.note = `덧붙일 말은 ${REJECT_NOTE_MAX}자까지 쓸 수 있어요`;
  else if (reason === "other" && length === 0) errors.note = "거절 이유를 적어 주세요";
  return errors;
}

export const rejectSchema = z
  .object({
    socialingId: z.number().int().positive(),
    applicationId: z.number().int().positive(),
    reason: z.enum(REJECT_REASON_VALUES),
    note: z.string(),
  })
  .refine(({ reason, note }) => Object.keys(rejectFieldErrors(reason, note)).length === 0);
