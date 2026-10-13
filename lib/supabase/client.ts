import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** 브라우저용 Supabase 클라이언트. 로그인 세션은 쿠키에서 읽는다. 지금은 사진 업로드에만 쓴다 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
