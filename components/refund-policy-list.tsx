import { REFUND_TEXT, type RefundPolicyText } from "@/lib/refund-policy";

// 취소·환불 규칙 글 (spec 6장 환불 기준). 상세(P03) collapsible-row "취소·환불 규칙"의 펼친 내용과
// 신청 확인(O02)의 notice-box "취소·환불 규칙" 안에 같은 글로 들어간다. 계산은 lib/refund-policy.ts.
// 글자색은 담는 상자를 따르고, 마지막 데모 안내만 body-sm text-muted.

export function RefundPolicyList({ policy }: { policy: RefundPolicyText }) {
  return (
    <div className="flex flex-col gap-xs text-body-md">
      <div>
        <p className="font-medium">{REFUND_TEXT.acceptedHeading}</p>
        <ul className="mt-xxs flex flex-col gap-xxs">
          {policy.acceptedLines.map((line) => (
            <li key={line} className="flex gap-xs">
              <span aria-hidden>•</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium">{REFUND_TEXT.alwaysHeading}</p>
        <ul className="mt-xxs flex flex-col gap-xxs">
          <li className="flex gap-xs">
            <span aria-hidden>•</span>
            {policy.alwaysFull}
          </li>
        </ul>
      </div>
      <p>{REFUND_TEXT.lock}</p>
      <p className="text-body-sm text-text-muted">{REFUND_TEXT.demo}</p>
    </div>
  );
}
