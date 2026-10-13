import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthPage, requiresLogin, safeNextPath, withNext } from "@/lib/routes";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * 요청마다 로그인 세션을 갱신하고(만료된 토큰을 새로 받아 쿠키에 쓴다), 주소에 따라 보낸다 (spec 8.7).
 * - 로그인이 필요한 주소에 비로그인 → /login?next=원래 주소
 * - 로그인한 사람이 /login·/signup → next 주소, 없으면 홈
 * 권한(호스트인지 등)은 각 화면과 DB 함수가 다시 확인한다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // 세션 쿠키를 쓸 때 함께 붙여야 하는 캐시 금지 헤더 (다른 사람에게 세션이 캐시되지 않게)
  let sessionHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        sessionHeaders = { ...sessionHeaders, ...headers };
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // 클라이언트를 만든 바로 다음에 부른다. 사이에 다른 코드를 넣으면 세션이 엉킬 수 있다(Supabase 안내).
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!loggedIn && requiresLogin(pathname)) {
    return redirectWithSession(request, response, sessionHeaders, withNext("/login", `${pathname}${search}`));
  }
  if (loggedIn && isAuthPage(pathname)) {
    return redirectWithSession(request, response, sessionHeaders, safeNextPath(request.nextUrl.searchParams.get("next")));
  }
  return response;
}

/** 다른 주소로 보내면서 방금 갱신한 세션 쿠키도 함께 넘긴다 */
function redirectWithSession(
  request: NextRequest,
  response: NextResponse,
  sessionHeaders: Record<string, string>,
  to: string,
) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(sessionHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}
