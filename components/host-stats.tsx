"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/button";
import type { HostRecord } from "@/lib/queries/host-record";

// DESIGN.md host-stats (spec M5·6장). 상세(P03) 호스트 영역의 호스트 기록.
// normal: 기준 문구 + 2×2 칸, new-host: 숫자 대신 안내 상자, ratio-hidden: 소개 일치 칸만 안내,
// load-failed: 기록만 실패 (상세와 신청은 그대로, Q3). 숫자를 점수 하나로 합치지 않는다.

const CRITERIA = "최근 6개월 기록 · 별점이나 점수로 합치지 않아요";

export function HostStats({ record }: { record: HostRecord }) {
  if (record.isNewHost) {
    return (
      <div className="flex flex-col gap-xs">
        <p className="text-body-sm text-text-secondary">{CRITERIA}</p>
        <p className="rounded-lg bg-surface-muted p-md text-body-md text-text-secondary">
          새 호스트 · 기록이 쌓이면 숫자로 보여 줘요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-body-sm text-text-secondary">{CRITERIA}</p>
      <dl className="grid grid-cols-2 gap-xs">
        <Cell label="열린 소셜링" value={`${record.openedCount}회`} />
        <Cell label="호스트 취소" value={`${record.canceledCount}회`} />
        {record.matchRate === null ? (
          <Cell label="소개 일치" note="응답 5건 이상부터 보여요" />
        ) : (
          <Cell
            label="소개 일치"
            value={`${Math.round(record.matchRate * 100)}%`}
            sub={`응답 ${record.responseCount}건`}
          />
        )}
        <Cell label="후기" value={`${record.reviewCount}개`} />
      </dl>
    </div>
  );
}

function Cell({ label, value, sub, note }: { label: string; value?: string; sub?: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-xxs rounded-lg border border-border-default bg-surface p-md">
      <dt className="text-body-sm text-text-secondary">{label}</dt>
      {value ? (
        <dd className="flex flex-col">
          <span className="text-title-xl text-text-primary">{value}</span>
          {sub && <span className="text-body-sm text-text-muted">{sub}</span>}
        </dd>
      ) : (
        <dd className="text-body-sm text-text-secondary">{note}</dd>
      )}
    </div>
  );
}

/** host-stats/load-failed: "기록을 불러오지 못했어요" + 다시 시도(그 칸만 다시 읽는다) */
export function HostStatsFailed() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-sm rounded-lg border border-dashed border-border-default bg-surface-muted px-md"
    >
      <p className="text-body-md text-text-secondary">기록을 불러오지 못했어요</p>
      <Button
        variant="text-link"
        size="inline"
        loading={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        다시 시도
      </Button>
    </div>
  );
}

/** 기록을 불러오는 동안: 기준 문구 막대 + 2×2 칸 */
export function HostStatsSkeleton() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-xs motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      <div className="h-[18px] w-3/4 rounded-md bg-surface-muted" />
      <div className="grid grid-cols-2 gap-xs">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-[84px] rounded-lg bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
