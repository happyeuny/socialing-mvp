import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin, UserCheck, Users, Wallet } from "lucide-react";
import { Suspense } from "react";
import { ApplyBar } from "@/components/apply-bar";
import { CategoryIcon, CategoryName, categoryTone } from "@/components/category-art";
import { ErrorStateFull } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";
import { HostProfileRow } from "@/components/host-profile-row";
import { HostStats, HostStatsFailed, HostStatsSkeleton } from "@/components/host-stats";
import { InfoList } from "@/components/info-list";
import { IntroText } from "@/components/intro-text";
import { NoticeBox } from "@/components/notice-box";
import { SkeletonDetail } from "@/components/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { StatusTag } from "@/components/status-tag";
import { AvatarInitial } from "@/components/avatar-initial";
import { TrustLabelButton, type TrustCriteriaValues } from "@/components/trust-criteria-sheet";
import { UrlNotice } from "@/components/url-notice";
import { formatDateTime, formatFee, formatVenue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { noticeMessage } from "@/lib/notices";
import { getHostRecord, type HostRecord } from "@/lib/queries/host-record";
import { getApplyBarViewer, type ApplyBarViewer } from "@/lib/queries/my-socialings";
import { getSocialing, socialingPhotoUrl, type SocialingDetail } from "@/lib/queries/socialings";
import { readSimulatedState, type SimulatedState } from "@/lib/simulated-state";

// P03 소셜링 상세 본문 (spec M4, 8.6, 8.7, 8.9). 로그인 없이 본다.
// 맨 아래 apply-bar(spec 8.4)가 붙는다. 호스트 기록(spec M5)은 본문과 따로 읽어서, 실패해도 그 칸만 다시 시도한다(Q3).
// 화면 상태 흉내 `?_state=partial`은 호스트 기록만 실패시킨다.
// 등급 라벨 "믿고 가는 호스트"(spec M5)는 호스트 기록의 등급 칸으로 정해 제목 아래 호스트 줄과 호스트 묶음 닉네임 아래에 붙고,
// 누르면 O03이 열린다. 기록을 못 읽으면 라벨도 보이지 않는다.
// 배치는 DESIGN.md 상세(P03) 배치: surface-bg 위에 대표 그림 → 16 겹쳐 올라온 흰 제목 묶음 → 정보 카드 → 소개 카드 → 호스트 카드
// → "신청 전에 확인해 주세요"(소셜링 규칙, 아래 고정 영역 바로 위).

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
      <main className="flex flex-1 flex-col pb-2xl">
        <CoverPhoto socialing={socialing} />
        <section className="relative -mt-md flex flex-col gap-xs rounded-t-2xl bg-surface px-page-x pt-lg pb-lg">
          <div className="flex flex-wrap items-center gap-[6px]">
            <StatusBadge status={socialing.status} />
            {socialing.status_tag && <StatusTag tag={socialing.status_tag} />}
            <span className="ml-xxs text-body-md text-text-secondary">
              <CategoryName slug={socialing.category_slug} name={socialing.category_name} /> ·{" "}
              {socialing.has_alcohol ? "술 있음" : "술 없음"}
            </span>
          </div>
          <h2 className="text-title-xl break-words text-text-primary">{socialing.title}</h2>
          <HostProfileRow
            nickname={socialing.host_nickname}
            trustLabel={
              <Suspense fallback={null}>
                <HostTrustLabel hostId={socialing.host_id} simulated={simulated} />
              </Suspense>
            }
          />
        </section>

        <InfoList rows={infoRows(socialing)} className="mx-page-x mt-sm" />

        <div className="flex flex-col gap-xl px-page-x pt-xl">
          <section className="flex flex-col gap-sm">
            <h3 className="text-title-lg text-text-primary">소개</h3>
            <div className="flex flex-col gap-md rounded-xl bg-surface p-md shadow-card">
              <IntroText text={socialing.description} />
              {socialing.join_type === "approval" && socialing.approval_criteria?.trim() && (
                <NoticeBox variant="info" title="호스트 승인 기준">
                  {socialing.approval_criteria}
                </NoticeBox>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-sm">
            <h3 className="text-title-lg text-text-primary">호스트</h3>
            <div className="flex flex-col gap-sm rounded-xl bg-surface p-md shadow-card">
              <Suspense
                fallback={
                  <>
                    <HostIdentity nickname={socialing.host_nickname} />
                    <HostStatsSkeleton />
                  </>
                }
              >
                <HostRecordSection hostId={socialing.host_id} nickname={socialing.host_nickname} simulated={simulated} />
              </Suspense>
            </div>
          </section>

          <BeforeApplySection />
        </div>
      </main>
      <ApplyBar socialing={socialing} viewer={viewer} />
      {/* 다른 화면에서 보내며 남긴 안내 (예: 호스트가 아닌 사람이 관리 주소 → "호스트만 볼 수 있어요") */}
      <UrlNotice message={noticeMessage(query.notice)} />
    </div>
  );
}

/** 소셜링 규칙: 호스트와 참가자 모두 하면 안 되는 행동 (spec M4·6장, SH4a). 호스트가 바꾸거나 끌 수 없다 */
const SOCIALING_RULES = [
  "종교 활동이나 영업 권유하기",
  "앱에 적힌 금액 외에 돈을 요구하기",
  "운영 스태프를 참가자인 것처럼 소개하기",
] as const;

/**
 * "신청 전에 확인해 주세요" (spec M4·8.9 P03): 신청 버튼 바로 위에서 읽히게 상세 맨 아래에 둔다.
 * 소셜링 규칙(notice-box/caution)은 모든 상세에 늘 펼쳐 보인다(호스트 본인·지난 소셜링 포함). 신청 확인 창(O02)에는 넣지 않는다.
 */
function BeforeApplySection() {
  return (
    <section className="flex flex-col gap-sm">
      <h3 className="text-title-lg text-text-primary">신청 전에 확인해 주세요</h3>
      <div className="flex flex-col gap-md rounded-xl bg-surface p-md shadow-card">
        <NoticeBox variant="caution" title="소셜링 규칙">
          <p>호스트와 참가자 모두 아래 행동을 할 수 없어요</p>
          <ul className="mt-xxs flex flex-col gap-xxs">
            {SOCIALING_RULES.map((rule) => (
              <li key={rule} className="flex gap-xs">
                <span aria-hidden>•</span>
                {rule}
              </li>
            ))}
          </ul>
        </NoticeBox>
      </div>
    </section>
  );
}

/** 호스트 기록. 화면 상태 흉내 `?_state=partial`이면 실패한다 */
async function loadHostRecord(hostId: string, simulated: SimulatedState | null): Promise<HostRecord> {
  if (simulated === "partial") throw new Error("화면 상태 흉내: 호스트 기록만 실패");
  return getHostRecord(hostId);
}

/** 등급을 채운 호스트면 O03에 보일 값, 아니면 null (판단은 DB 함수의 is_trusted_host) */
function trustValues(record: HostRecord): TrustCriteriaValues | null {
  if (!record.isTrustedHost || record.matchRate === null) return null;
  return {
    openedCount: record.openedCount,
    canceledCount: record.canceledCount,
    matchRate: record.matchRate,
    responseCount: record.responseCount,
  };
}

/** 제목 아래 호스트 줄의 등급 라벨. 기록을 못 읽으면 라벨 없이 (오류 안내는 호스트 묶음이 한다) */
async function HostTrustLabel({ hostId, simulated }: { hostId: string; simulated: SimulatedState | null }) {
  const values = await loadHostRecord(hostId, simulated).then(trustValues, () => null);
  return values ? <TrustLabelButton values={values} /> : null;
}

/** 호스트 카드 맨 위: avatar-initial 48 + 닉네임(700), 그 아래 등급 라벨 (와이어프레임 04_detail, DESIGN.md host-stats/normal) */
function HostIdentity({ nickname, trust }: { nickname: string; trust?: TrustCriteriaValues | null }) {
  return (
    <div className="flex items-center gap-sm">
      <AvatarInitial nickname={nickname} size={48} />
      <div className="flex min-w-0 flex-col items-start gap-xxs">
        <p className="max-w-full truncate text-title-md font-bold text-text-primary">{nickname}</p>
        {trust && <TrustLabelButton values={trust} />}
      </div>
    </div>
  );
}

/** 호스트 기록. 못 읽으면 이 칸만 "기록을 불러오지 못했어요" + 다시 시도, 상세와 신청은 그대로 (spec 5장 Q3, 8.6) */
async function HostRecordSection({
  hostId,
  nickname,
  simulated,
}: {
  hostId: string;
  nickname: string;
  simulated: SimulatedState | null;
}) {
  let record: HostRecord;
  try {
    record = await loadHostRecord(hostId, simulated);
  } catch (error) {
    if (simulated !== "partial") console.error(error);
    return (
      <>
        <HostIdentity nickname={nickname} />
        <HostStatsFailed />
      </>
    );
  }
  return (
    <>
      <HostIdentity nickname={nickname} trust={trustValues(record)} />
      <HostStats record={record} />
    </>
  );
}

/** 대표 그림 4:3. 사진이 없으면 카테고리 soft → surface-bg 그라데이션 + 가운데 카테고리 선 아이콘 84 (DESIGN.md 상세 배치) */
function CoverPhoto({ socialing }: { socialing: SocialingDetail }) {
  if (!socialing.cover_photo_path) {
    const tone = categoryTone(socialing.category_slug);
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center bg-linear-160 to-surface-bg",
          tone.from,
          tone.text,
        )}
      >
        <CategoryIcon slug={socialing.category_slug} className="size-[84px]" strokeWidth={1.5} />
      </div>
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
    { label: "소셜링 일시", icon: Calendar, value: formatDateTime(socialing.starts_at), strong: true },
    { label: "신청 마감", icon: Clock, value: formatDateTime(socialing.apply_deadline_at) },
    {
      label: "장소",
      icon: MapPin,
      value: formatVenue(socialing.venue_type, socialing.venue_name),
      sub: `${socialing.region_sido} ${socialing.region_sigungu}`,
    },
    { label: "총 참가비", icon: Wallet, value: formatFee(socialing.fee), strong: true },
    { label: "모집 방식", icon: UserCheck, value: socialing.join_type === "approval" ? "호스트 승인" : "선착순" },
    socialing.staff_count > 0
      ? {
          label: "인원",
          icon: Users,
          value: `${people} · 스태프 ${socialing.staff_count}명`,
          sub: "스태프는 정원에 세지 않아요",
        }
      : { label: "인원", icon: Users, value: people },
  ];
}
