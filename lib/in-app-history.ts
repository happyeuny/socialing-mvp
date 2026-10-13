// 머리글 뒤로 버튼이 "앱 안 이전 화면"이 있는지 알아보는 곳 (spec 8.7: 이전 화면이 없으면 뒤로 = 홈).
// 브라우저 코드에서만 쓴다.

let navigatedInApp = false;

/** 앱 안에서 화면을 옮겼을 때 부른다 (components/navigation-tracker.tsx) */
export function markInAppNavigation() {
  navigatedInApp = true;
}

type NavigationLike = { canGoBack?: unknown };

/**
 * 뒤로 가면 이 앱의 화면이 나오면 true.
 * Navigation API가 있으면(Chromium 등) 같은 사이트 기록만 보는 canGoBack을 쓰고,
 * 없으면 이 탭에서 앱 안 이동이 있었는지로 판단한다.
 */
export function canGoBackInApp(): boolean {
  const navigation = (window as Window & { navigation?: NavigationLike }).navigation;
  if (typeof navigation?.canGoBack === "boolean") return navigation.canGoBack;
  return navigatedInApp;
}
