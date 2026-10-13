import { BookOpen, Palette, Smile, Tag, UsersRound, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 대표 사진이 없을 때의 카테고리 그림 (DESIGN.md socialing-card/no-photo, spec 8.5): primary-soft 바탕 + 카테고리 선 아이콘.
// 아이콘은 홈 시안의 카테고리 바로가기와 같은 모양을 쓴다.

const ICONS: Record<string, LucideIcon> = {
  learning: BookOpen,
  hobby: Smile,
  activity: Zap,
  culture: Palette,
  party: UsersRound,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? Tag;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

export function CategoryArt({ slug, className, iconClassName }: { slug: string; className?: string; iconClassName?: string }) {
  return (
    <div className={cn("flex items-center justify-center bg-primary-soft text-primary-strong", className)}>
      <CategoryIcon slug={slug} className={cn("size-8", iconClassName)} />
    </div>
  );
}
