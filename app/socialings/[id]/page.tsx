import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplyBar } from "@/components/apply-bar";
import { CategoryArt } from "@/components/category-art";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { HostProfileRow } from "@/components/host-profile-row";
import { InfoList } from "@/components/info-list";
import { IntroText } from "@/components/intro-text";
import { NoticeBox } from "@/components/notice-box";
import { SkeletonDetail } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatusTag } from "@/components/status-tag";
import { AvatarInitial } from "@/components/avatar-initial";
import { UrlNotice } from "@/components/url-notice";
import { formatDateTime, formatFee, formatVenue } from "@/lib/format";
import { noticeMessage } from "@/lib/notices";
import { getApplyBarViewer, type ApplyBarViewer } from "@/lib/queries/my-socialings";
import { getSocialing, socialingPhotoUrl, type SocialingDetail } from "@/lib/queries/socialings";
import { readSimulatedState } from "@/lib/simulated-state";

// P03 소셜링 상세 본문 (spec M4, 8.6, 8.7, 8.9). 로그인 없이 본다.
// 맨 아래 apply-bar(spec 8.4)가 붙는다. 호스트 기록 숫자는 MS6, 등급 라벨은 MS8.

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** 주소의 번호. 숫자가 아니면 없는 소셜링 */
function parseId(value: string): number | null {
  return /^[1-9]\d{0,14}$/.test(value) ? Number(value) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const socialing = id ? await getSocialing(id).catch(() => null) : null;
  return { title: socialing ? `${socialing.title} · 문화소셜링` : "소셜링 상세 · 문화소셜링" };
}

export default async function SocialingPage({ params, searchParams }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const query = await searchParams;
  const simulated = readSimulatedState(query);

  if (simulated === "loading") {
    return (
      <>
        <HeaderSub title="소셜링 상세" />
        <SkeletonDetail />
      </>
    );
  }

  let socialing: SocialingDetail | null;
  let viewer: ApplyBarViewer;
  try {
    if (simulated === "error") throw new Error("화면 상태 흉내: 오류");
    // 아래 영역이 보는 사람의 신청에 따라 바뀌므로, 그 값도 못 읽으면 화면 전체를 다시 시도한다(틀린 버튼을 보이지 않게)
    [socialing, viewer] = await Promise.all([getSocialing(id), getApplyBarViewer(id)]);
  } catch (error) {
    if (simulated !== "error") console.error(error);
    return (
      <>
        <HeaderSub title="소셜링 상세" />
        <main className="px-page-x">
          <ErrorStateFull />
        </main>
      </>
    );
  }
  if (!socialing) notFound();

  // 내용이 짧아도 apply-bar가 화면 맨 아래에 붙도록 화면 높이만큼 채운다
  return (
    <div className="flex min-h-dvh flex-col">
      <HeaderSub title="소셜링 상세" />
      <main className="flex flex-1 flex-col bg-surface pb-2xl">
        <CoverPhoto socialing={socialing} />
        <div className="flex flex-col gap-xl px-page-x pt-lg">
          <section className="flex flex-col gap-xs">
            <div className="flex flex-wrap items-center gap-[6px]">
              <StatusBadge status={socialing.status} />
              {socialing.status_tag && <StatusTag tag={socialing.status_tag} />}
              <span className="ml-xxs text-body-md text-text-secondary">
                {socialing.category_name} · {socialing.has_alcohol ? "술 있음" : "술 없음"}
              </span>
            </div>
            <h2 className="text-title-xl break-words text-text-primary">{socialing.title}</h2>
            <HostProfileRow nickname={socialing.host_nickname} />
          </section>

          <div className="border-t border-border-divider pt-xxs">
            <InfoList rows={infoRows(socialing)} />
          </div>

          <section className="flex flex-col gap-sm border-t border-border-divider pt-xl">
            <h3 className="text-title-md text-text-primary">소개</h3>
            <IntroText text={socialing.description} />
          </section>

          {socialing.join_type === "approval" && socialing.approval_criteria?.trim() && (
            <NoticeBox title="호스트 승인 기준">{socialing.approval_criteria}</NoticeBox>
          )}

          <section className="flex flex-col gap-sm">
            <h3 className="text-title-md text-text-primary">호스트</h3>
            {/* 호스트 기록(host-stats)은 MS6에서 이 아래에 붙는다 */}
            <div className="flex items-center gap-sm">
              <AvatarInitial nickname={socialing.host_nickname} size={48} />
              <p className="text-title-md text-text-primary">{socialing.host_nickname}</p>
            </div>
          </section>
        </div>
      </main>
      <ApplyBar socialing={socialing} viewer={viewer} />
      {/* 다른 화면에서 보내며 남긴 안내 (예: 호스트가 아닌 사람이 관리 주소 → "호스트만 볼 수 있어요") */}
      <UrlNotice message={noticeMessage(query.notice)} />
    </div>
  );
}

function CoverPhoto({ socialing }: { socialing: SocialingDetail }) {
  if (!socialing.cover_photo_path) {
    return (
      <CategoryArt slug={socialing.category_slug} className="aspect-[4/3] w-full" iconClassName="size-16" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 올릴 때 이미 1MB 이하로 줄인 Storage 공개 사진
    <img src={socialingPhotoUrl(socialing.cover_photo_path)} alt="" className="aspect-[4/3] w-full object-cover" />
  );
}

function infoRows(socialing: SocialingDetail) {
  const people = `참가자 ${socialing.accepted_count}/${socialing.capacity}명`;
  return [
    { label: "소셜링 일시", value: formatDateTime(socialing.starts_at), strong: true },
    { label: "신청 마감", value: formatDateTime(socialing.apply_deadline_at) },
    {
      label: "장소",
      value: formatVenue(socialing.venue_type, socialing.venue_name),
      sub: `${socialing.region_sido} ${socialing.region_sigungu}`,
    },
    { label: "총 참가비", value: formatFee(socialing.fee), strong: true },
    { label: "모집 방식", value: socialing.join_type === "approval" ? "호스트 승인" : "선착순" },
    socialing.staff_count > 0
      ? { label: "인원", value: `${people} · 스태프 ${socialing.staff_count}명`, sub: "스태프는 정원에 세지 않아요" }
      : { label: "인원", value: people },
  ];
}
