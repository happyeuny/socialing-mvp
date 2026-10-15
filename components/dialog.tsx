"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useReturnFocus } from "@/lib/return-focus";

// DESIGN.md dialog. surface, 모서리 xl, 여백 20, 뒤 dim, 화면 가운데.
// dialog/result: 결과 안내 + primary "확인" 하나 ("신청하지 못했어요 · 방금 정원이 찼어요").
// dialog/confirm · confirm-danger: 호스트 동작 확인(O04). 네트워크 오류 문구는 alert로 받아 버튼 위에 보인다.
// 버튼은 footer로 받는다. 바텀시트 위에도 뜰 수 있게 바텀시트보다 위(z-50)에 놓는다.
// 닫으면 포커스는 창을 연 버튼으로 돌아간다(lib/return-focus).

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  /** 버튼 위 오류 문구(body-sm, danger). 예: "처리하지 못했어요. 연결을 확인하고 다시 시도해 주세요" */
  alert?: React.ReactNode;
  footer: React.ReactNode;
  /** 닫은 뒤 포커스를 돌려줄 곳 (창을 연 버튼). 없으면 열 때 포커스가 있던 곳 */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
};

export function Dialog({ open, onOpenChange, title, children, alert, footer, returnFocusRef }: DialogProps) {
  const returnFocus = useReturnFocus(returnFocusRef);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-dim" />
        <DialogPrimitive.Content
          role="alertdialog"
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2*var(--spacing-page-x))] max-w-[358px] -translate-x-1/2 -translate-y-1/2 flex-col gap-lg rounded-xl bg-surface p-lg outline-none"
        >
          <div className="flex flex-col gap-xs">
            <DialogPrimitive.Title className="text-title-lg text-text-primary">{title}</DialogPrimitive.Title>
            {children ? (
              <DialogPrimitive.Description className="text-body-md text-text-secondary">
                {children}
              </DialogPrimitive.Description>
            ) : null}
            {alert ? (
              <p role="alert" className="text-body-sm text-danger">
                {alert}
              </p>
            ) : null}
          </div>
          <div className="flex gap-xs">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
