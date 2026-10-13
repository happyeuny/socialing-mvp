import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvatarInitial } from "@/components/avatar-initial";
import { logout } from "@/lib/actions/auth";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

// P06 내 소셜링 자리. 지금은 로그인 확인용으로 맨 위 닉네임과 로그아웃만 있다 (SP1).
// 신청한 소셜링·호스트인 소셜링 탭은 MS3에서 채운다.

export const metadata: Metadata = { title: "내 소셜링 · 문화소셜링" };

export default async function MePage() {
  const supabase = await createClient();
  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect(withNext("/login", "/me"));

  const { data: profile, error } = await supabase.from("profiles").select("nickname").eq("id", userId).single();
  if (error) throw new Error("프로필을 불러오지 못했습니다.");

  return (
    <main className="flex flex-col gap-xl px-page-x py-xl">
      <h1 className="text-title-xl text-text-primary">내 소셜링</h1>
      {/* DESIGN.md profile-row: avatar-initial 48 + 닉네임, 오른쪽 로그아웃 */}
      <section className="flex items-center gap-sm">
        <AvatarInitial nickname={profile.nickname} size={48} />
        <p className="min-w-0 flex-1 truncate text-title-md text-text-primary" data-testid="profile-nickname">
          {profile.nickname}
        </p>
        <form action={logout}>
          <button type="submit" className="min-h-touch-min px-xs text-body-md text-text-secondary">
            로그아웃
          </button>
        </form>
      </section>
      <p className="text-body-md text-text-secondary">신청한 소셜링과 호스트인 소셜링은 다음 단계에서 보여요.</p>
    </main>
  );
}
