// DESIGN.md logo-wordmark. 두 원이 겹친 그림(primary · primary-strong) + "문화"(500, deep) + "소셜링"(800, primary-strong).
// 19px/24, 자간 −0.045em. 로고라서 글자 토큰의 예외다. 그림은 읽지 않고, 링크 이름은 글자 그대로 "문화소셜링".

export function LogoWordmark() {
  return (
    <span className="inline-flex items-center gap-[7px] text-[19px] leading-6 tracking-[-0.045em]">
      <svg viewBox="0 0 26 22" className="h-[22px] w-[26px] shrink-0" aria-hidden>
        <circle cx="9" cy="11" r="8" className="fill-primary" />
        <circle cx="17" cy="11" r="8" className="fill-primary-strong" fillOpacity={0.88} />
      </svg>
      <span>
        <span className="font-medium text-deep">문화</span>
        <span className="font-extrabold text-primary-strong">소셜링</span>
      </span>
    </span>
  );
}
