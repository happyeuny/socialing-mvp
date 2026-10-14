// 다른 화면으로 보내면서 남기는 짧은 안내 (spec 8.6 권한 오류, 8.7). 주소에 `?notice=키`를 붙이고,
// 받는 화면의 <UrlNotice />가 toast/info로 한 번 띄운다.

export const NOTICES = {
  "host-only": "호스트만 볼 수 있어요",
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
