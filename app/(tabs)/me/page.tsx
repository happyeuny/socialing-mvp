import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AvatarInitial } from "@/components/avatar-initial";
import { SkeletonCardList } from "@/components/skeleton";
import { TopTabs } from "@/components/top-tabs";
import { logout } from "@/lib/actions/auth";
import { withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { createClient } from "@/lib/supabase/server";
import { AppliedSocialings } from "./applied-socialings";
import { HostedSocialings } from "./hosted-socialings";

// P06 내 소셜링 (spec M11, 8.6). 맨 위 닉네임 · 로그아웃, 위 탭 "신청한 소셜링 / 호스트인 소셜링"(`?tab=host`).
// 탭 목록 자리만 불러오는 동안 스켈레톤, 실패하면 그 자리에 다시 시도. 화면 상태 흉내 `?_state=`도 탭 자리에만 쓴다.

export const metadata: Metadata = { title: "내 소셜링 · 문화소셜링" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MePage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab === "host" ? "host" : "applied";
  const simulated = readSimulatedState(params);

  const supabase = await createClient();
  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) redirect(withNext("/login", tab === "host" ? "/me?tab=host" : "/me"));

  const { data: profile, error } = await supabase.from("profiles").select("nickname").eq("id", userId).single();
  if (error) throw new Error("프로필을 불러오지 못했습니다.");

  return (
    <main className="flex flex-col px-page-x pt-lg pb-xl">
      <h1 className="sr-only">내 소셜링</h1>
      {/* DESIGN.md profile-row: avatar-initial 48 + 닉네임, 오른쪽 로그아웃 */}
      <section aria-label="내 정보" className="flex items-center gap-sm">
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

      <div className="mt-md">
        <TopTabs
          label="내 소셜링 보기"
          active={tab}
          tabs={[
            { key: "applied", label: "신청한 소셜링", href: "/me" },
            { key: "host", label: "호스트인 소셜링", href: "/me?tab=host" },
          ]}
        />
      </div>

      <div className="mt-xl">
        {simulated === "loading" ? (
          <SkeletonCardList />
        ) : (
          // 탭을 바꾸면 목록을 새로 기다린다
          <Suspense key={tab} fallback={<SkeletonCardList />}>
            {tab === "host" ? <HostedSocialings simulated={simulated} /> : <AppliedSocialings simulated={simulated} />}
          </Suspense>
        )}
      </div>
    </main>
  );
}
