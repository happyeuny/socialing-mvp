import { createClient } from "@/lib/supabase/server";

export type Viewer = { id: string; nickname: string };

/**
 * 지금 보는 사람. 비로그인이면 null.
 * 닉네임은 가입 때 넣은 user_metadata.nickname을 로그인 토큰(getClaims)에서 읽어 DB를 한 번 덜 부른다.
 * 닉네임을 바꾸는 기능은 없어서 profiles와 같다.
 */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const nickname = claims.user_metadata?.nickname;
  return { id: claims.sub, nickname: typeof nickname === "string" ? nickname : "" };
}
