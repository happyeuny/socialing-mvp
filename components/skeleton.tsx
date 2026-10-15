// DESIGN.md skeleton. 불러오는 동안 카드·글 모양의 회색 틀 (spec 8.6 로딩).

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-surface-muted ${className}`} />;
}

/** skeleton/card-list: 96px 정사각 + 글 막대 3개인 카드 2개. 카드처럼 테두리 없이 shadow-card */
export function SkeletonCardList() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-sm motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      {[0, 1].map((key) => (
        <div key={key} className="flex gap-md rounded-xl bg-surface p-md shadow-card">
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

/** 소셜링 관리(P11) 로딩: 요약 카드 + 진행 단계 + 신청자 줄 2개 */
export function SkeletonManage() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-xl px-page-x pt-lg motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      <div className="flex flex-col gap-xs rounded-xl border border-border-default bg-surface p-lg">
        <Bar className="h-6 w-16" />
        <Bar className="h-6 w-4/5" />
        <Bar className="h-5 w-3/5" />
      </div>
      <div className="flex flex-col gap-sm">
        <Bar className="h-6 w-24" />
        <Bar className="h-10 w-full" />
        <Bar className="h-13 w-full" />
      </div>
      <div className="flex flex-col gap-sm">
        <Bar className="h-6 w-16" />
        <Bar className="h-11 w-full" />
        {[0, 1].map((key) => (
          <div key={key} className="flex items-center gap-sm py-sm">
            <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
            <div className="flex flex-1 flex-col gap-xxs">
              <Bar className="h-5 w-16" />
              <Bar className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 인증 후기(P10) 로딩: 후기 줄 모양 2개 (원 + 닉네임, 제목, 글 2줄) */
export function SkeletonReviewList() {
  return (
    <div role="status" aria-busy className="flex flex-col divide-y divide-border-divider motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      {[0, 1].map((key) => (
        <div key={key} className="flex flex-col gap-md py-lg">
          <div className="flex items-center gap-sm">
            <div className="size-8 shrink-0 rounded-full bg-surface-muted" />
            <Bar className="h-5 w-24" />
          </div>
          <Bar className="h-5 w-3/5" />
          <div className="flex flex-col gap-xs">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 후기 쓰기(P09) 로딩: 소셜링 요약 카드 + 글 칸 + 사진 칸 + 질문 상자 */
export function SkeletonReviewWrite() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-xl px-page-x pt-lg motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      <div className="flex flex-col gap-xs rounded-xl border border-border-default bg-surface p-lg">
        <Bar className="h-6 w-32" />
        <Bar className="h-6 w-4/5" />
        <Bar className="h-5 w-3/5" />
      </div>
      <div className="flex flex-col gap-xs">
        <Bar className="h-5 w-12" />
        <Bar className="h-30 w-full" />
      </div>
      <div className="flex flex-col gap-xs">
        <Bar className="h-5 w-24" />
        <Bar className="size-24" />
      </div>
      <Bar className="h-40 w-full" />
    </div>
  );
}

/** 소셜링 등록·수정(P07·P08) 로딩: 사진 칸 + 라벨·입력 칸 묶음 4개 */
export function SkeletonSocialingForm() {
  return (
    <div role="status" aria-busy className="flex flex-col gap-xl px-page-x pt-lg motion-safe:animate-pulse">
      <span className="sr-only">불러오는 중</span>
      <div className="flex flex-col gap-xs">
        <Bar className="h-6 w-32" />
        <Bar className="size-24" />
      </div>
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="flex flex-col gap-xs">
          <Bar className="h-6 w-20" />
          <Bar className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
