import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md notice-box. 모서리 lg, 여백 14·16.
// feed-criteria: surface-muted 바탕, text-secondary. 신청 확인(O02)의 승인 기준, 관리 화면의 종료·취소 안내 등 회색 안내.
// info: primary-soft 바탕, 제목 primary-strong 700 + 앞에 정보 아이콘 16, 본문 text-primary. 상세(P03) 소개 카드 안 "호스트 승인 기준".
// caution: caution-soft 바탕, 제목 caution 700 + 앞에 주의 아이콘 16, 본문 text-primary. 상세(P03) "신청 전에 확인해 주세요"의 소셜링 규칙.

type NoticeBoxProps = {
  title?: string;
  variant?: "feed-criteria" | "info" | "caution";
  children: React.ReactNode;
};

const TONE = {
  info: { box: "bg-primary-soft text-text-primary", title: "text-primary-strong", Icon: Info },
  caution: { box: "bg-caution-soft text-text-primary", title: "text-caution", Icon: TriangleAlert },
} as const;

export function NoticeBox({ title, variant = "feed-criteria", children }: NoticeBoxProps) {
  const tone = variant === "feed-criteria" ? null : TONE[variant];
  return (
    <div
      className={cn(
        "flex flex-col gap-xxs rounded-lg px-md py-[14px] text-body-md",
        tone ? tone.box : "bg-surface-muted text-text-secondary",
      )}
    >
      {title &&
        (tone ? (
          <p className={cn("flex items-center gap-xs font-bold", tone.title)}>
            <tone.Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            {title}
          </p>
        ) : (
          <p className="font-medium text-text-primary">{title}</p>
        ))}
      <div className="break-words whitespace-pre-line">{children}</div>
    </div>
  );
}
