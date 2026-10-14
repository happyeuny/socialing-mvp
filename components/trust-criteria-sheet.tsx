"use client";

import { CircleCheck } from "lucide-react";
import { useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { Button } from "@/components/button";
import { TrustLabel } from "@/components/trust-label";

// DESIGN.md bottom-sheet/trust-criteria (O03 등급 조건, spec M5·6장·8.2). 상세(P03)의 trust-label을 누르면 열린다.
// 라벨은 등급을 채운 호스트에게만 보여서, 이 창의 세 줄은 늘 채움(✓)이다. 등급 판단은 DB 함수(get_host_record)가 하고
// 여기서는 그 값을 보여 주기만 한다. 상세가 이미 읽은 호스트 기록을 받아서 따로 불러오지 않는다.

export type TrustCriteriaValues = {
  openedCount: number;
  canceledCount: number;
  /** 소개 일치 비율 0~1 (반올림 안 함). 화면은 정수 %로 반올림 */
  matchRate: number;
  responseCount: number;
};

/** 누르면 O03을 여는 trust-label. 보이는 높이는 24, 누르는 영역은 위아래로 넓혀 44 */
export function TrustLabelButton({ values }: { values: TrustCriteriaValues }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="relative flex shrink-0 rounded-full before:absolute before:inset-x-0 before:-inset-y-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-strong"
      >
        <TrustLabel />
        <span className="sr-only"> 등급 조건 보기</span>
      </button>
      <TrustCriteriaSheet open={open} onOpenChange={setOpen} values={values} returnFocusRef={buttonRef} />
    </>
  );
}

function TrustCriteriaSheet({
  open,
  onOpenChange,
  values,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: TrustCriteriaValues;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const rows = [
    { condition: "열린 소셜링 5회 이상", value: `${values.openedCount}회` },
    { condition: "호스트 취소 0회", value: `${values.canceledCount}회` },
    {
      condition: "소개 일치 90% 이상",
      value: `${Math.round(values.matchRate * 100)}%`,
      sub: `(응답 ${values.responseCount}건)`,
    },
  ];

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      returnFocusRef={returnFocusRef}
      title="등급 조건"
      titleLeading={<TrustLabel />}
      description="최근 6개월 기록으로 아래 3가지를 모두 채운 호스트예요"
      footer={
        <Button className="flex-1" onClick={() => onOpenChange(false)}>
          확인
        </Button>
      }
    >
      <ul className="flex flex-col divide-y divide-border-divider rounded-xl border border-border-default">
        {rows.map((row) => (
          <li key={row.condition} className="flex min-h-14 items-center gap-sm px-md py-sm">
            <CircleCheck className="size-6 shrink-0 fill-text-primary text-surface" aria-hidden />
            <span className="min-w-0 flex-1 text-body-md text-text-primary">
              <span className="sr-only">채움: </span>
              {row.condition}
            </span>
            <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-xxs text-right">
              <span className="text-title-md text-text-primary">{row.value}</span>
              {row.sub && <span className="text-body-sm text-text-muted">{row.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-text-muted">별점이나 점수가 아니라 공개된 기록으로만 정해요</p>
    </BottomSheet>
  );
}
