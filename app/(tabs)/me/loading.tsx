import { SkeletonCardList } from "@/components/skeleton";

// P06 불러오는 동안 회색 틀 (spec 8.6 로딩): 닉네임 줄 + 위 탭 + 카드 목록
export default function Loading() {
  return (
    <main className="flex flex-col px-page-x pt-lg pb-xl" aria-busy>
      <div className="flex items-center gap-sm">
        <div className="size-12 rounded-full bg-surface-muted" />
        <div className="h-5 w-24 rounded-md bg-surface-muted" />
      </div>
      <div className="mt-md h-12 border-b border-border-default" />
      <div className="mt-xl">
        <SkeletonCardList />
      </div>
    </main>
  );
}
