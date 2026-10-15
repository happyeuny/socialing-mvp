// DESIGN.md C4 apply-bar 공통 틀: 화면 맨 아래에 붙는 영역. 위 경계와 그림자, 여백 12·16, 아이폰 아래 안전 영역.
// 상세(P03)의 apply-bar, 후기 쓰기(P09)·등록·수정(P07·P08)의 아래 고정 영역이 같은 틀을 쓴다.
// 짧은 안내(토스트)는 이 영역 바로 위에 뜬다(data-toast-anchor).

type ApplyBarShellProps = {
  /** 주면 이름 있는 영역(section)으로 읽힌다. 예: 상세의 "신청" */
  label?: string;
  children: React.ReactNode;
};

const SHELL_CLASS =
  "sticky bottom-0 z-10 flex flex-col items-center gap-xs border-t border-border-default bg-surface px-md pt-sm pb-[calc(12px+env(safe-area-inset-bottom))] shadow-up";

export function ApplyBarShell({ label, children }: ApplyBarShellProps) {
  if (label) {
    return (
      <section aria-label={label} data-toast-anchor className={SHELL_CLASS}>
        {children}
      </section>
    );
  }
  return (
    <div data-toast-anchor className={SHELL_CLASS}>
      {children}
    </div>
  );
}
