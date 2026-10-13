// DESIGN.md notice-box/feed-criteria. surface-muted 바탕, text-secondary, 모서리 lg, 여백 14·16. 호스트 승인 기준 등 안내.

export function NoticeBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-xxs rounded-lg bg-surface-muted px-md py-[14px] text-body-md text-text-secondary">
      {title && <p className="font-medium text-text-primary">{title}</p>}
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}
