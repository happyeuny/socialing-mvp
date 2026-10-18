// 취소·환불 규칙 안내 (spec 6장 "환불 기준", M4·M7, 8.2 O02·O05). 실제 결제·환불은 없고 안내만 한다(spec 10장).
// 상세(P03) "취소·환불 규칙" 접는 줄, 신청 확인(O02) 목록, 신청 취소 확인(O05) 한 줄이 모두 이 파일 하나로 계산한다.
// 돈이 오가지 않는 표시 규칙이라 DB 함수가 아니라 화면 계산으로 둔다(날짜 필터 lib/explore-filter.ts와 같은 방식).
//
// 참여 확정 뒤 신청 취소: 소셜링 일시 72시간 전까지(그 시각 포함) 전액, 24시간 전까지 50%, 그 뒤 없음.
// 참여자 책임이 아닌 경우(승인 전 신청 취소, 호스트 거절, 호스트 취소, 최소 인원이 모이지 않아 취소)는 언제든 전액.
// 확정 기한까지 확정하지 않아 생긴 호스트 취소는 "호스트 취소"에 들어간다(MS15 U4, 04 2.7).
// 화면에는 기준 시각을 한국 시간 실제 시각으로 적고(lib/format), 이미 지난 구간 줄은 빼서 첫 줄이 늘 "지금 기준"이 되게 한다.

import { formatDateTime } from "@/lib/format";

const HOUR_MS = 60 * 60 * 1000;

/** 전액 환불 기준: 소셜링 일시 몇 시간 전까지 */
export const REFUND_FULL_HOURS = 72;
/** 50% 환불 기준: 소셜링 일시 몇 시간 전까지 */
export const REFUND_HALF_HOURS = 24;

export type RefundRate = 100 | 50 | 0;

/** 안내를 보이는지: 참가비가 있고 소셜링 일시 전 (0원이면 어디에도 없다) */
export function showsRefundPolicy(fee: number, startsAt: string | Date, now: Date): boolean {
  return fee > 0 && now.getTime() < new Date(startsAt).getTime();
}

/** 기준 시각: 전액(72시간 전) · 50%(24시간 전) */
export function refundDeadlines(startsAt: string | Date): { full: Date; half: Date } {
  const start = new Date(startsAt).getTime();
  return { full: new Date(start - REFUND_FULL_HOURS * HOUR_MS), half: new Date(start - REFUND_HALF_HOURS * HOUR_MS) };
}

/** 참여 확정 뒤 지금 신청을 취소하면 몇 % 기준인지 (기준 시각 그 순간까지는 앞 구간) */
export function acceptedCancelRate(startsAt: string | Date, now: Date): RefundRate {
  const { full, half } = refundDeadlines(startsAt);
  if (now.getTime() <= full.getTime()) return 100;
  if (now.getTime() <= half.getTime()) return 50;
  return 0;
}

/** 화면에 보이는 규칙 목록 (P03 펼친 내용과 O02가 같은 글) */
export type RefundPolicyText = {
  /** "10/19(월) 오후 7:30까지: 전액 환불" 같은 줄. 지난 구간은 빠지고 "… 뒤: 환불 없음"은 늘 남는다 */
  acceptedLines: string[];
  /** 언제든 전액인 경우. 선착순은 승인 단계가 없어 "호스트 취소 · 최소 인원이 모이지 않아 취소"만 */
  alwaysFull: string;
};

export const REFUND_TEXT = {
  title: "취소·환불 규칙",
  acceptedHeading: "참여 확정 뒤 신청을 취소하면",
  alwaysHeading: "이럴 때는 언제든 전액 환불",
  lock: "참여 확정자가 생기면 일시·장소·참가비는 바뀌지 않아요",
  demo: "결제 기능이 없는 데모예요. 실제 결제와 환불은 일어나지 않아요",
} as const;

export function refundPolicyText(
  startsAt: string | Date,
  joinType: "first_come" | "approval",
  now: Date,
): RefundPolicyText {
  const { full, half } = refundDeadlines(startsAt);
  const rate = acceptedCancelRate(startsAt, now);
  const lines: string[] = [];
  if (rate === 100) lines.push(`${formatDateTime(full)}까지: 전액 환불`);
  if (rate >= 50) lines.push(`${formatDateTime(half)}까지: 50% 환불`);
  lines.push(`${formatDateTime(half)} 뒤: 환불 없음`);
  return {
    acceptedLines: lines,
    alwaysFull:
      joinType === "approval"
        ? "승인 전에 신청 취소 · 호스트가 거절 · 호스트 취소 · 최소 인원이 모이지 않아 취소"
        : "호스트 취소 · 최소 인원이 모이지 않아 취소",
  };
}

const CANCEL_NOTICE: Record<RefundRate, string> = {
  100: "지금 취소하면 전액 환불 기준이에요",
  50: "지금 취소하면 50% 환불 기준이에요",
  0: "지금 취소하면 환불되지 않는 기준이에요",
};

/** 신청 취소 확인(O05)의 한 줄. 창을 여는 순간으로 계산한다 */
export function cancelRefundNotice(status: "pending" | "accepted", startsAt: string | Date, now: Date): string {
  if (status === "pending") return "승인 전 취소라 전액 환불 기준이에요";
  return CANCEL_NOTICE[acceptedCancelRate(startsAt, now)];
}
