import { BookOpen, Palette, Smile, Tag, UsersRound, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// DESIGN.md category-art/default (spec 8.5): 대표 사진이 없을 때 그 카테고리 soft 바탕 + 카테고리 색 선 아이콘.
// 아이콘은 홈 카테고리 바로가기와 같은 모양을 쓴다.
// 카테고리 색은 카테고리를 알아보는 곳에만 쓴다(DESIGN.md Colors): 그림, 카드의 카테고리 이름과 점, 홈 바로가기, 상세 대표 그림.

const ICONS: Record<string, LucideIcon> = {
  learning: BookOpen,
  hobby: Smile,
  activity: Zap,
  culture: Palette,
  party: UsersRound,
};

type CategoryTone = {
  /** soft 바탕 + 카테고리 색 글자(아이콘) */
  art: string;
  /** 카테고리 색 글자 */
  text: string;
  /** 카테고리 색 바탕(점) */
  dot: string;
};

// Tailwind가 class를 찾을 수 있게 이름을 그대로 적는다
const TONES: Record<string, CategoryTone> = {
  learning: { art: "bg-category-learning-soft text-category-learning", text: "text-category-learning", dot: "bg-category-learning" },
  hobby: { art: "bg-category-hobby-soft text-category-hobby", text: "text-category-hobby", dot: "bg-category-hobby" },
  activity: { art: "bg-category-activity-soft text-category-activity", text: "text-category-activity", dot: "bg-category-activity" },
  culture: { art: "bg-category-culture-soft text-category-culture", text: "text-category-culture", dot: "bg-category-culture" },
  party: { art: "bg-category-party-soft text-category-party", text: "text-category-party", dot: "bg-category-party" },
};

/** 모르는 카테고리는 예전 그림처럼 primary-soft 바탕 + primary-strong */
const FALLBACK_TONE: CategoryTone = { art: "bg-primary-soft text-primary-strong", text: "text-primary-strong", dot: "bg-primary-strong" };

export function categoryTone(slug: string): CategoryTone {
  return TONES[slug] ?? FALLBACK_TONE;
}

export function CategoryIcon({ slug, className, strokeWidth = 1.75 }: { slug: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[slug] ?? Tag;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}

export function CategoryArt({ slug, className, iconClassName }: { slug: string; className?: string; iconClassName?: string }) {
  return (
    <div className={cn("flex items-center justify-center", categoryTone(slug).art, className)}>
      <CategoryIcon slug={slug} className={cn("size-8", iconClassName)} />
    </div>
  );
}
