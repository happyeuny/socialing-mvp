import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md notice-box. 모서리 lg, 여백 14·16.
// feed-criteria: surface-muted 바탕, text-secondary. 신청 확인(O02)의 승인 기준, 관리 화면의 종료·취소 안내 등 회색 안내.
// info: primary-soft 바탕, 제목 primary-strong 700 + 앞에 정보 아이콘 16, 본문 text-primary. 상세(P03) 소개 카드 안 "호스트 승인 기준".

type NoticeBoxProps = {
  title?: string;
  variant?: "feed-criteria" | "info";
  children: React.ReactNode;
};

export function NoticeBox({ title, variant = "feed-criteria", children }: NoticeBoxProps) {
  const info = variant === "info";
  return (
    <div
      className={cn(
        "flex flex-col gap-xxs rounded-lg px-md py-[14px] text-body-md",
        info ? "bg-primary-soft text-text-primary" : "bg-surface-muted text-text-secondary",
      )}
    >
      {title &&
        (info ? (
          <p className="flex items-center gap-xs font-bold text-primary-strong">
            <Info className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            {title}
          </p>
        ) : (
          <p className="font-medium text-text-primary">{title}</p>
        ))}
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}
