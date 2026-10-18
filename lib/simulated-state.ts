// 화면 상태 흉내 (decisions.md): 주소에 `?_state=empty|error|loading|partial`을 붙이면 빈 결과·오류·로딩 화면을 그대로 보여 준다.
// partial은 화면 일부 묶음만 실패한 경우(spec 8.6 "묶음 하나 실패", Q3): 홈에서는 최근 인증 후기 묶음, 상세(P03)에서는 호스트 기록,
// 내 소셜링(P06) 신청한 소셜링 탭에서는 내 참여 기록(MS15).
// 시드 데이터를 지우지 않고 E2E와 미리보기에서 빈 상태·오류를 확인하려는 장치라, 운영 주소(VERCEL_ENV=production)에서는 무시한다.

export type SimulatedState = "empty" | "error" | "loading" | "partial";

const STATES: readonly SimulatedState[] = ["empty", "error", "loading", "partial"];

export function readSimulatedState(searchParams: Record<string, string | string[] | undefined>): SimulatedState | null {
  if (process.env.VERCEL_ENV === "production") return null;
  const value = searchParams._state;
  return STATES.find((state) => state === value) ?? null;
}
