import { MapPin } from "lucide-react";
import Link from "next/link";
import { shortSido } from "@/lib/format";

// DESIGN.md shortcut-branch: 작은 카드(surface, 테두리 없음 + shadow-card, 모서리 lg, 여백 12), 가운데 정렬.
// 위치 핀 16(primary-strong) 아래 지점 이름(title-md, 700) + 지역(label, text-secondary).
// 핀을 왼쪽에 두면 390px에서 지역 글이 "서울 강/남구"로 끊겨 가운데 정렬로 둔다.
// 홈 스터디지점 바로가기 3개. 누르면 탐색(P01)의 그 지점 소셜링만.

export function ShortcutBranch({ id, name, sido, sigungu }: { id: number; name: string; sido: string; sigungu: string }) {
  return (
    <Link
      href={`/explore?branch=${id}`}
      className="flex min-w-0 flex-1 flex-col items-center gap-xxs rounded-lg bg-surface p-sm text-center shadow-card"
    >
      <MapPin className="size-4 text-primary-strong" aria-hidden />
      <span className="text-title-md font-bold text-text-primary">{name}</span>
      <span className="text-label text-text-secondary">
        {shortSido(sido)} {sigungu}
      </span>
    </Link>
  );
}
