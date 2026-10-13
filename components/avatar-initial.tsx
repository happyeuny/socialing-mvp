import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// DESIGN.md avatar-initial. 원 안에 닉네임 첫 글자. 프로필 사진은 없다.
// default: surface-muted 원 + text-secondary 글자, 크기 20 · 32 · 40 · 48.
// strong(머리글 28)은 머리글을 만들 때(MS2) 더한다.

const avatarInitialVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-medium text-text-secondary",
  {
    variants: {
      size: {
        20: "size-5 text-label",
        32: "size-8 text-body-sm",
        40: "size-10 text-body-md",
        48: "size-12 text-title-md",
      },
    },
    defaultVariants: { size: 40 },
  },
);

type AvatarInitialProps = VariantProps<typeof avatarInitialVariants> & {
  nickname: string;
  className?: string;
};

export function AvatarInitial({ nickname, size, className }: AvatarInitialProps) {
  return (
    <span aria-hidden className={cn(avatarInitialVariants({ size }), className)}>
      {Array.from(nickname.trim())[0] ?? ""}
    </span>
  );
}
