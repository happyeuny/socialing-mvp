import { AvatarInitial } from "@/components/avatar-initial";

// DESIGN.md host-profile-row/default. 높이 52, avatar-initial 40 + "호스트" + 닉네임(title-md).
// 조건을 채운 호스트의 trust-label은 MS8에서 닉네임 오른쪽에 붙는다.

export function HostProfileRow({ nickname }: { nickname: string }) {
  return (
    <div className="flex h-13 items-center gap-sm">
      <AvatarInitial nickname={nickname} size={40} />
      <p className="flex min-w-0 items-baseline gap-xxs">
        <span className="shrink-0 text-body-md text-text-secondary">호스트</span>
        <span className="truncate text-title-md text-text-primary">{nickname}</span>
      </p>
    </div>
  );
}
