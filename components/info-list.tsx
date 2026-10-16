import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md info-list/default. 흰 카드(모서리 xl, shadow-card, 여백 6·14) 안 라벨·값 행, 행 사이 border-divider 1px.
// 라벨 앞에 아이콘 칸 30×30(모서리 md, primary-soft 바탕, primary-strong 아이콘 17). 값은 700, 값 아래 작은 보조 글(sub)을 둘 수 있다.
// 기능을 더할 때 값 하나로 말할 수 있는 정보는 이 카드에 행으로 붙인다(DESIGN.md C5 ①).
// note: 값 아래 보조 글이 길 때(총 참가비의 참가비 설명) 행 아래 줄 전체에 라벨 글자 시작에 맞춰 왼쪽 정렬, 줄바꿈 그대로.

export type InfoRow = {
  label: string;
  icon: LucideIcon;
  value: React.ReactNode;
  sub?: string;
  /** 행 아래 줄 전체에 놓는 긴 보조 글 (참가비 설명, spec M4) */
  note?: string;
  /** 소셜링 일시·총 참가비처럼 먼저 봐야 하는 값은 primary-strong */
  strong?: boolean;
};

export function InfoList({ rows, className }: { rows: InfoRow[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-border-divider rounded-xl bg-surface px-[14px] py-[6px] shadow-card", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn("flex items-center justify-between gap-md py-sm", row.note && "flex-wrap gap-y-xxs")}
        >
          <dt className="flex shrink-0 items-center gap-xs text-body-md text-text-secondary">
            <span className="flex size-[30px] items-center justify-center rounded-md bg-primary-soft text-primary-strong">
              <row.icon className="size-[17px]" aria-hidden />
            </span>
            {row.label}
          </dt>
          <dd className="flex min-w-0 flex-col items-end text-right">
            <span className={cn("text-body-md font-bold", row.strong ? "text-primary-strong" : "text-text-primary")}>
              {row.value}
            </span>
            {row.sub && <span className="text-body-sm text-text-muted">{row.sub}</span>}
          </dd>
          {row.note && (
            <dd className="min-w-0 basis-full pl-[38px] text-body-sm break-words whitespace-pre-line text-text-secondary">
              {row.note}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
