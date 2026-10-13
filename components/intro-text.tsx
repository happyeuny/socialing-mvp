"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

// 상세 소개 (spec M4, 8.9): 5줄을 넘으면 접고 "더보기". 누르면 전부 펼친다.
// 넘치는지는 그려진 뒤에야 알 수 있어, 글 상자 크기를 지켜보다가(ResizeObserver) 넘칠 때만 버튼을 보인다.

export function IntroText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || expanded) return;
    const observer = new ResizeObserver(() => {
      setOverflowing(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div className="flex flex-col gap-md">
      <p
        ref={ref}
        className={cn(
          "text-body-long break-words whitespace-pre-line text-text-primary",
          !expanded && "line-clamp-5",
        )}
      >
        {text}
      </p>
      {overflowing && !expanded && (
        <Button variant="secondary" size="md" className="w-full" onClick={() => setExpanded(true)}>
          더보기
          <ChevronDown className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
