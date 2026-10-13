import type { Metadata } from "next";

// P01 탐색. 지금은 제목과 정렬 기준만 있고, 카드 목록은 다음 PR(MS2 탐색)에서 채운다.
// 필터 칩과 "파티·사교 숨기기" 토글은 MS6.

export const metadata: Metadata = { title: "탐색 · 문화소셜링" };

export default function ExplorePage() {
  return (
    <main className="flex flex-col gap-xxs px-page-x pt-xl pb-md">
      <h1 className="text-title-xl text-text-primary">탐색</h1>
      <p className="text-body-sm text-text-secondary">가까운 일시 순 · 유료 노출 없음</p>
    </main>
  );
}
