"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

// DESIGN.md bottom-sheet. surface, 위 모서리 2xl, 손잡이 36×4, 뒤 dim. 신청하는 사람 쪽 창(O02·O03·O05)이 쓴다.
// 손잡이는 모양만 있고 끌어서 닫지 않는다. 뒤 배경을 누르거나 "돌아가기"·Esc로 닫는다(Radix Dialog, 포커스는 창 안에 머문다).

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** 제목 왼쪽에 붙는 것 (O03의 trust-label) */
  titleLeading?: React.ReactNode;
  /** 제목 바로 아래 한 줄(요약). 읽기 프로그램이 창 설명으로 읽는다 */
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** 아래 버튼 줄 */
  footer: React.ReactNode;
  /** 처리 중에는 뒤 배경·Esc로 닫히지 않게 */
  locked?: boolean;
  /** 닫은 뒤 포커스를 돌려줄 곳 (창을 연 버튼). Radix Dialog.Trigger를 쓰지 않아 직접 알려 준다 */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  titleLeading,
  description,
  children,
  footer,
  locked,
  returnFocusRef,
}: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (locked && !next ? undefined : onOpenChange(next))}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-dim motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          // 설명 줄이 없으면 Radix가 설명을 찾지 않게 한다
          {...(description ? {} : { "aria-describedby": undefined })}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[90dvh] w-full max-w-(--spacing-screen) flex-col rounded-t-2xl bg-surface outline-none",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom",
          )}
        >
          <div className="flex justify-center pt-sm pb-xs" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-border-default" />
          </div>
          <div className="flex flex-col gap-md overflow-y-auto px-lg pt-xs pb-md">
            <div className="flex flex-col gap-xxs">
              {titleLeading ? (
                <div className="flex flex-wrap items-center gap-xs">
                  {titleLeading}
                  <DialogPrimitive.Title className="text-title-lg text-text-primary">{title}</DialogPrimitive.Title>
                </div>
              ) : (
                <DialogPrimitive.Title className="text-title-lg text-text-primary">{title}</DialogPrimitive.Title>
              )}
              {description ? (
                <DialogPrimitive.Description className="text-body-md text-text-secondary">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {children}
          </div>
          <div className="flex gap-xs px-lg pt-xs pb-[calc(20px+env(safe-area-inset-bottom))]">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
