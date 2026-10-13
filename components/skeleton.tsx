// DESIGN.md skeleton. 불러오는 동안 카드·글 모양의 회색 틀 (spec 8.6 로딩).

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface-muted ${className}`} />;
}

/** skeleton/card-list: 96px 정사각 + 글 막대 3개인 카드 2개 */
export function SkeletonCardList() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-sm motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-md rounded-xl border border-border-default bg-surface p-md">
          <div className="size-24 shrink-0 rounded-lg bg-surface-muted" />
          <div className="flex flex-1 flex-col gap-xs pt-xxs">
            <Bar className="h-6 w-16" />
            <Bar className="h-5 w-4/5" />
            <Bar className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** skeleton/hero: 홈 히어로 자리 (높이 280, 모서리 2xl) */
export function SkeletonHero() {
  return (
    <div role="status" aria-busy className="h-[280px] rounded-2xl bg-surface-muted motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
    </div>
  );
}

/** skeleton/detail: 4:3 사진 칸 + 제목 막대 + 정보 줄 */
export function SkeletonDetail() {
  return (
    <div role="status" aria-busy className="flex flex-col motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      <div className="aspect-[4/3] w-full bg-surface-muted" />
      <div className="flex flex-col gap-sm px-page-x py-lg">
        <Bar className="h-6 w-24" />
        <Bar className="h-7 w-4/5" />
        <Bar className="h-10 w-1/2" />
        <div className="mt-sm flex flex-col gap-sm">
          {[0, 1, 2, 3, 4].map((key) => (
            <Bar key={key} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
