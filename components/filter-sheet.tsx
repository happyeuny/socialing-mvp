"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md bottom-sheet/filter-sheet (O01). bottom-sheet와 같은 틀(surface, 위 모서리 2xl, 손잡이 36×4, 뒤 dim)에
// 제목 + 닫기 X(아래 옅은 구분선), 스크롤되는 내용, 아래 고정 버튼 줄(위 옅은 구분선).
// 칩에서 열면 그 항목 위치로 스크롤한다(onOpenAutoFocus에서 bodyRef를 쓴다).

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  bodyRef?: React.Ref<HTMLDivElement>;
  /** 열린 직후. 기본 포커스(닫기 버튼) 대신 원하는 항목으로 옮길 때 event.preventDefault() */
  onOpenAutoFocus?: (event: Event) => void;
};

export function FilterSheet({ open, onOpenChange, title, children, footer, bodyRef, onOpenAutoFocus }: FilterSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-dim motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[90dvh] w-full max-w-(--spacing-screen) flex-col rounded-t-2xl bg-surface outline-none",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom",
          )}
        >
          <div className="flex justify-center pt-sm pb-xs" aria-hidden>
            <span className="h-1 w-9 rounded-full bg-border-default" />
          </div>
          <div className="flex items-center justify-between border-b border-border-divider pr-xs pl-lg">
            <DialogPrimitive.Title className="text-title-lg text-text-primary">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="닫기"
              className="flex size-touch-min items-center justify-center rounded-full text-text-primary"
            >
              <X className="size-6" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div ref={bodyRef} className="relative flex flex-col gap-xl overflow-y-auto px-lg pt-lg pb-xl">
            {children}
          </div>
          <div className="flex gap-xs border-t border-border-divider px-lg pt-sm pb-[calc(20px+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
