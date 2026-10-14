import { AvatarInitial } from "@/components/avatar-initial";

// DESIGN.md host-profile-row/default. 높이 52, avatar-initial 40 + "호스트" + 닉네임(title-md)
// + 조건을 채운 호스트만 trust-label(누르면 O03). 라벨은 호스트 기록을 따로 읽어 붙이므로 자리로 받는다.

export function HostProfileRow({ nickname, trustLabel }: { nickname: string; trustLabel?: React.ReactNode }) {
  return (
    <div className="flex h-13 items-center gap-sm">
      <AvatarInitial nickname={nickname} size={40} />
      <p className="flex min-w-0 items-baseline gap-xxs">
        <span className="shrink-0 text-body-md text-text-secondary">호스트</span>
        <span className="truncate text-title-md text-text-primary">{nickname}</span>
      </p>
      {trustLabel}
    </div>
  );
}
