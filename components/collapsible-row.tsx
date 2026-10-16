"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

// DESIGN.md collapsible-row (C5 ③ 접는 줄): 흰 카드 안 제목 줄(title-md, 높이 52, 오른쪽 ⌄). 누르면 아래로 펼쳐지고 ⌃.
// 길거나 가끔 보는 정보에 쓴다. 처음엔 접혀 있고, 버튼이 aria-expanded로 펼침 상태를 읽어 준다.
// 첫 쓰임: 상세(P03) "신청 전에 확인해 주세요"의 "취소·환불 규칙" (spec M4).

export function CollapsibleRow({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-[52px] w-full items-center justify-between gap-sm text-left text-title-md text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-strong"
      >
        {title}
        <Chevron className="size-5 shrink-0 text-text-secondary" aria-hidden />
      </button>
      <div id={panelId} hidden={!open} className="pb-xs">
        {children}
      </div>
    </div>
  );
}
