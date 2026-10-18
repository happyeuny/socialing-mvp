// 다른 화면으로 보내면서 남기는 짧은 안내 (spec 8.6 권한 오류, 8.7). 주소에 `?notice=키`를 붙이고,
// 받는 화면의 <UrlNotice />가 toast/info로 한 번 띄운다.

export const NOTICES = {
  "host-only": "호스트만 볼 수 있어요",
  // 후기 쓰기(P09) 작성 조건이 안 맞음 → 상세 (spec 8.7, screen-cases E07~09)
  "review-not-participant": "참여 확정자만 쓸 수 있어요",
  "review-not-completed": "호스트가 종료한 뒤 쓸 수 있어요",
  "review-done": "이미 후기를 썼어요",
  // 종료·호스트 취소된 소셜링의 수정(P08) 주소 → 관리 (spec 8.7, screen-cases E06)
  "edit-completed": "종료한 소셜링은 수정할 수 없어요",
  "edit-canceled": "호스트 취소한 소셜링은 수정할 수 없어요",
  // 신청 마감·확정 기한이 지나 계산으로 취소·호스트 취소된 소셜링 (MS15 U4, 04 2.5)
  "edit-auto-canceled": "이미 취소된 소셜링이에요",
} as const;

export type NoticeKey = keyof typeof NOTICES;

/** 안내를 붙인 주소 */
export function withNotice(path: string, notice: NoticeKey): string {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${notice}`;
}

/** 주소의 notice 값 → 안내 문구. 모르는 값이면 null */
export function noticeMessage(value: string | string[] | undefined): string | null {
  return typeof value === "string" && Object.hasOwn(NOTICES, value) ? NOTICES[value as NoticeKey] : null;
}
