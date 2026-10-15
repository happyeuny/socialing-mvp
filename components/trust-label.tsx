import { Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md trust-label/default. 기준이 공개된 등급 라벨 "믿고 가는 호스트 ⓘ" (spec M5·6장). 글자 앞에 방패 14.
// point 바탕, on-point 글자 label, 높이 24, 모서리 full. point 색은 이것과 count-pill에만.
// 조건을 채운 호스트에게만 보인다. 상세에서 누르는 라벨은 TrustLabelButton(O03을 연다), 이것은 모양만.

export function TrustLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-xxs whitespace-nowrap rounded-full bg-point px-xs text-label text-on-point",
        className,
      )}
    >
      <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
      믿고 가는 호스트
      <Info className="size-3.5" aria-hidden />
    </span>
  );
}
