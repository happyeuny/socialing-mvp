import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// DESIGN.md avatar-initial. 원 안에 닉네임 첫 글자. 프로필 사진은 없다.
// default: surface-muted 원 + text-secondary 글자, 크기 20 · 32 · 40 · 48.
// strong: primary-strong 원 + 흰 글자, 28 (로그인한 머리글 오른쪽).

const avatarInitialVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
  {
    variants: {
      tone: {
        default: "bg-surface-muted text-text-secondary",
        strong: "bg-primary-strong text-surface",
      },
      size: {
        20: "size-5 text-label",
        28: "size-7 text-body-sm",
        32: "size-8 text-body-sm",
        40: "size-10 text-body-md",
        48: "size-12 text-title-md",
      },
    },
    defaultVariants: { tone: "default", size: 40 },
  },
);

type AvatarInitialProps = VariantProps<typeof avatarInitialVariants> & {
  nickname: string;
  className?: string;
};

export function AvatarInitial({ nickname, tone, size, className }: AvatarInitialProps) {
  return (
    <span aria-hidden className={cn(avatarInitialVariants({ tone, size }), className)}>
      {Array.from(nickname.trim())[0] ?? ""}
    </span>
  );
}
