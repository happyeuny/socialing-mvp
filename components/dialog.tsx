"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";

// DESIGN.md dialog. surface, 모서리 xl, 여백 20, 뒤 dim, 화면 가운데.
// dialog/result: 결과 안내 + primary "확인" 하나 ("신청하지 못했어요 · 방금 정원이 찼어요").
// 버튼은 footer로 받는다. 바텀시트 위에도 뜰 수 있게 바텀시트보다 위(z-50)에 놓는다.

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
};

export function Dialog({ open, onOpenChange, title, children, footer }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-dim" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2*var(--spacing-page-x))] max-w-[358px] -translate-x-1/2 -translate-y-1/2 flex-col gap-lg rounded-xl bg-surface p-lg outline-none"
        >
          <div className="flex flex-col gap-xs">
            <DialogPrimitive.Title className="text-title-lg text-text-primary">{title}</DialogPrimitive.Title>
            {children ? (
              <DialogPrimitive.Description className="text-body-md text-text-secondary">
                {children}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <div className="flex gap-xs">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
