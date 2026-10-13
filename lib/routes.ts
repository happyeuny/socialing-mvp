// 로그인이 필요한 주소와 로그인 뒤 돌아갈 주소 (spec 8.7)

const APP_ORIGIN = "http://app.invalid";

/**
 * 로그인 뒤 돌아갈 주소. 앱 안 주소(`/`로 시작하고 `//`로 시작하지 않음)만 받고, 아니면 홈.
 * 브라우저가 `/\`나 탭·줄바꿈이 섞인 주소를 다른 사이트로 읽는 경우도 막으려고 URL로 한 번 더 확인한다.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  try {
    const url = new URL(next, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

/** `next`를 붙인 주소. 홈으로 돌아가면 붙이지 않는다 */
export function withNext(path: "/login" | "/signup", next: string): string {
  return next === "/" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

// P06 내 소셜링, P07 등록, P08 수정, P09 후기 쓰기, P11 관리
const LOGIN_REQUIRED = [
  /^\/me\/?$/,
  /^\/socialings\/new\/?$/,
  /^\/socialings\/[^/]+\/(edit|manage|review)\/?$/,
];

export function requiresLogin(pathname: string): boolean {
  return LOGIN_REQUIRED.some((pattern) => pattern.test(pathname));
}

/** 로그인 화면이나 가입 화면이면 true. 로그인한 사람은 `next`로 보낸다 */
export function isAuthPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}
