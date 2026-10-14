import Link from "next/link";
import { shortSido } from "@/lib/format";

// DESIGN.md shortcut-branch: 작은 카드(surface, border-default, 모서리 lg, 여백 12) 안 지점 이름(title-md) + 지역(body-sm).
// 홈 스터디지점 바로가기 3개. 누르면 탐색(P01)의 그 지점 소셜링만.

export function ShortcutBranch({ id, name, sido, sigungu }: { id: number; name: string; sido: string; sigungu: string }) {
  return (
    <Link
      href={`/explore?branch=${id}`}
      className="flex min-w-0 flex-1 flex-col items-center gap-xxs rounded-lg border border-border-default bg-surface p-sm text-center"
    >
      <span className="text-title-md text-text-primary">{name}</span>
      <span className="text-body-sm text-text-secondary">
        {shortSido(sido)} {sigungu}
      </span>
    </Link>
  );
}
