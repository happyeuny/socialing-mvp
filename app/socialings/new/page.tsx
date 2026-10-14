import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { SkeletonSocialingForm } from "@/components/skeleton";
import { toSeoulInput } from "@/lib/format";
import { type SocialingFormCatalog, getSocialingFormCatalog } from "@/lib/queries/catalog";
import { getViewer } from "@/lib/queries/viewer";
import { withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import { SocialingForm } from "../socialing-form";

// P07 소셜링 등록 (spec M8, 8.6, 8.7). 로그인한 사람은 누구나 호스트가 된다.
// "소셜링 열기"를 누르면 create_socialing이 입력을 다시 확인하고 모집중 소셜링을 만든다.

export const metadata: Metadata = { title: "소셜링 등록 · 문화소셜링" };

const NEW_PATH = "/socialings/new";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewSocialingPage({ searchParams }: Props) {
  const simulated = readSimulatedState(await searchParams);

  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  const viewer = await getViewer();
  if (!viewer) redirect(withNext("/login", NEW_PATH));

  if (simulated === "loading") {
    return (
      <>
        <HeaderSub title="소셜링 등록" />
        <SkeletonSocialingForm />
      </>
    );
  }

  let catalog: SocialingFormCatalog;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    catalog = await getSocialingFormCatalog();
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return (
      <>
        <HeaderSub title="소셜링 등록" />
        <main className="px-page-x">
          <ErrorStateFull />
        </main>
      </>
    );
  }

  return (
    <>
      <HeaderSub title="소셜링 등록" />
      <main>
        <SocialingForm mode="create" userId={viewer.id} catalog={catalog} minDateTime={toSeoulInput(new Date())} />
      </main>
    </>
  );
}
