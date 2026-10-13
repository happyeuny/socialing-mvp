import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";

// DESIGN.md section-header/default: 제목(title-md) + 오른쪽 text-link "전체 보기 ›" + 아래 기준 문구(body-sm, text-secondary).
// 목록 묶음은 규칙으로만 채우고 기준을 함께 적는다 (spec 8.1).

type SectionHeaderProps = {
  id: string;
  title: string;
  criteria?: string;
  moreHref?: string;
};

export function SectionHeader({ id, title, criteria, moreHref }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <div className="flex items-center justify-between gap-sm">
        <h2 id={id} className="text-title-md text-text-primary">
          {title}
        </h2>
        {moreHref && (
          <Link
            href={moreHref}
            aria-label={`${title} 전체 보기`}
            className={cn(buttonVariants({ variant: "text-link", size: "inline" }), "-my-sm text-body-sm")}
          >
            전체 보기
            <ChevronRight className="-ml-1.5 size-4" aria-hidden />
          </Link>
        )}
      </div>
      {criteria && <p className="text-body-sm text-text-secondary">{criteria}</p>}
    </div>
  );
}
