import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { SkeletonSocialingForm } from "@/components/skeleton";
import { toSeoulInput } from "@/lib/format";
import { withNotice } from "@/lib/notices";
import { type SocialingFormCatalog, getSocialingFormCatalog } from "@/lib/queries/catalog";
import { type EditPageData, type EditableSocialing, getEditPageData } from "@/lib/queries/manage";
import { socialingPhotoUrl } from "@/lib/queries/socialings";
import { getViewer } from "@/lib/queries/viewer";
import { withNext } from "@/lib/routes";
import { readSimulatedState } from "@/lib/simulated-state";
import type { SocialingFormValues } from "@/lib/validation/socialing";
import { SocialingForm } from "../../socialing-form";

// P08 소셜링 수정 (spec M8, 8.6, 8.7). 그 소셜링의 호스트만, 종료·호스트 취소 전에만 들어온다.
// 등록(P07)과 같은 양식에 지금 값을 채우고, 잠금 기준(참여 확정·승인 대기 수)은 my_hosted_socialings가 센 값을 쓴다.
// "저장하기"를 누르면 update_socialing이 잠금·정원 하한·권한·상태를 다시 확인한다.

export const metadata: Metadata = { title: "소셜링 수정 · 문화소셜링" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseId(value: string): number | null {
  return /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null;
}

/** 저장된 소셜링 → 양식 값 (시·군·구는 이름으로 법정동코드를 찾는다) */
function toFormValues(socialing: EditableSocialing, catalog: SocialingFormCatalog): SocialingFormValues {
  const branch = socialing.venue_type === "branch";
  const region = catalog.regions.find(
    (item) => item.sido === socialing.region_sido && item.sigungu === socialing.region_sigungu,
  );
  return {
    title: socialing.title,
    description: socialing.description,
    categoryId: String(socialing.category_id),
    hasAlcohol: socialing.has_alcohol ? "yes" : "no",
    placeKind: branch ? "branch" : "region",
    branchId: branch ? String(socialing.venue_id) : "",
    sido: branch ? "" : socialing.region_sido,
    regionCode: branch ? "" : (region?.code ?? ""),
    placeName: branch ? "" : socialing.venue_name,
    startsAt: toSeoulInput(socialing.starts_at),
    applyDeadlineAt: toSeoulInput(socialing.apply_deadline_at),
    fee: String(socialing.fee),
    capacity: String(socialing.capacity),
    staffCount: String(socialing.staff_count),
    joinType: socialing.join_type,
    approvalCriteria: socialing.approval_criteria ?? "",
  };
}

export default async function EditSocialingPage({ params, searchParams }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const simulated = readSimulatedState(await searchParams);
  const editPath = `/socialings/${id}/edit`;

  // proxy.ts가 비로그인을 먼저 보내지만, 화면에서도 다시 확인한다
  const viewer = await getViewer();
  if (!viewer) redirect(withNext("/login", editPath));

  if (simulated === "loading") {
    return (
      <>
        <HeaderSub title="소셜링 수정" />
        <SkeletonSocialingForm />
      </>
    );
  }

  let data: EditPageData;
  let catalog: SocialingFormCatalog;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    [data, catalog] = await Promise.all([getEditPageData(id), getSocialingFormCatalog()]);
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return (
      <>
        <HeaderSub title="소셜링 수정" />
        <main className="px-page-x">
          <ErrorStateFull />
        </main>
      </>
    );
  }
  if (data.kind === "not-found") notFound();
  // 호스트가 아닌 사람 → 상세 + "호스트만 볼 수 있어요" (spec 8.7, screen-cases E05)
  if (data.kind === "not-host") redirect(withNotice(`/socialings/${id}`, "host-only"));
  // 종료·호스트 취소 → 관리 + 이유 (spec 8.7, screen-cases E06)
  if (data.closed) {
    redirect(withNotice(`/socialings/${id}/manage`, data.closed === "completed" ? "edit-completed" : "edit-canceled"));
  }

  const { socialing } = data;
  return (
    <>
      <HeaderSub title="소셜링 수정" />
      <main>
        <SocialingForm
          mode="edit"
          userId={viewer.id}
          catalog={catalog}
          minDateTime={toSeoulInput(new Date())}
          socialingId={id}
          original={toFormValues(socialing, catalog)}
          coverPhoto={
            socialing.cover_photo_path
              ? { path: socialing.cover_photo_path, url: socialingPhotoUrl(socialing.cover_photo_path) }
              : null
          }
          acceptedCount={data.acceptedCount}
          pendingCount={data.pendingCount}
        />
      </main>
    </>
  );
}
