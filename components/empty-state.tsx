import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";

// DESIGN.md empty-state. 48px 아이콘 원 + 제목 + 설명(있으면) + 다음 행동 버튼, 여백 48·20.
// default(no-applications 모양): 원 primary-soft, primary 버튼. filter(filter-no-results): 원 surface-muted, secondary 버튼.

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action: { href: string; label: string };
  tone?: "default" | "filter";
};

export function EmptyState({ icon: Icon, title, description, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-sm px-lg py-3xl text-center">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          tone === "filter" ? "bg-surface-muted text-text-secondary" : "bg-primary-soft text-primary-strong",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-xxs">
        <p className="text-title-md text-text-primary">{title}</p>
        {description && <p className="text-body-sm text-text-secondary">{description}</p>}
      </div>
      <Link
        href={action.href}
        className={cn(
          "mt-xs",
          buttonVariants({ variant: tone === "filter" ? "secondary" : "primary", size: "md" }),
        )}
      >
        {action.label}
      </Link>
    </div>
  );
}
