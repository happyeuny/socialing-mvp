import Link from "next/link";
import { CategoryIcon } from "@/components/category-art";

// DESIGN.md shortcut-category: 56px 원(surface, border-default) 안 카테고리 선 아이콘(primary-strong) + 아래 이름(label).
// 칸이 56px보다 좁은 휴대폰에서는 원이 칸 폭에 맞춰 조금 작아진다.
// 홈 카테고리 바로가기 5개. 누르면 탐색(P01)의 그 카테고리 (거르기는 MS6).

export function ShortcutCategory({ slug, name }: { slug: string; name: string }) {
  // "배움·자기계발"처럼 가운뎃점 뒤에서 줄을 바꿀 수 있게
  const [first, ...rest] = name.split("·");
  return (
    <Link href={`/explore?category=${slug}`} className="flex w-full flex-col items-center gap-xs text-center">
      <span className="flex aspect-square w-full max-w-14 items-center justify-center rounded-full border border-border-default bg-surface text-primary-strong">
        <CategoryIcon slug={slug} className="size-6" />
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
