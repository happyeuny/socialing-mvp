// P06 불러오는 동안 회색 틀 (spec 8.6 로딩)
export default function Loading() {
  return (
    <main className="flex flex-col gap-xl px-page-x py-xl" aria-busy>
      <div className="h-7 w-28 rounded-md bg-surface-muted" />
      <div className="flex items-center gap-sm">
        <div className="size-12 rounded-full bg-surface-muted" />
        <div className="h-5 w-24 rounded-md bg-surface-muted" />
      </div>
    </main>
  );
}
