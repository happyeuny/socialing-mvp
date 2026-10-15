import Link from "next/link";
import { CategoryIcon, categoryTone } from "@/components/category-art";
import { cn } from "@/lib/utils";

// DESIGN.md shortcut-category: 56px 원(테두리 없음, 카테고리 soft) 안 카테고리 선 아이콘 24(카테고리 색, 선 굵기 2) + 아래 이름(label).
// 칸이 56px보다 좁은 휴대폰에서는 원이 칸 폭에 맞춰 조금 작아진다.
// 홈 카테고리 바로가기 5개. 누르면 탐색(P01)의 그 카테고리 소셜링만.

export function ShortcutCategory({ slug, name }: { slug: string; name: string }) {
  // "배움·자기계발"처럼 가운뎃점 뒤에서 줄을 바꿀 수 있게
  const [first, ...rest] = name.split("·");
  return (
    <Link href={`/explore?category=${slug}`} className="flex w-full flex-col items-center gap-xs text-center">
      <span
        className={cn(
          "flex aspect-square w-full max-w-14 items-center justify-center rounded-full",
          categoryTone(slug).art,
        )}
      >
        <CategoryIcon slug={slug} className="size-6" strokeWidth={2} />
      </span>
      <span className="text-label break-keep text-text-primary">
        {first}
        {rest.map((part) => (
          <span key={part}>
            ·<wbr />
            {part}
          </span>
        ))}
      </span>
    </Link>
  );
}
