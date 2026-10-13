import { cn } from "@/lib/utils";

// DESIGN.md info-list/default. 라벨·값 행, 행 사이 border-divider 1px. 값 아래 작은 보조 글(sub)을 둘 수 있다.

export type InfoRow = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** 소셜링 일시·총 참가비처럼 먼저 봐야 하는 값은 굵게 */
  strong?: boolean;
};

export function InfoList({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="divide-y divide-border-divider">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-md py-sm">
          <dt className="shrink-0 text-body-md text-text-secondary">{row.label}</dt>
          <dd className="flex min-w-0 flex-col items-end text-right">
            <span className={cn("text-body-md text-text-primary", row.strong && "font-semibold")}>{row.value}</span>
            {row.sub && <span className="text-body-sm text-text-muted">{row.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
