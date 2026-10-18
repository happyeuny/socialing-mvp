import Link from "next/link";
import { ApplicationChip, type ApplicationChipVariant } from "@/components/application-chip";
import { AvatarInitial } from "@/components/avatar-initial";
import { CategoryArt, CategoryName } from "@/components/category-art";
import { StatusBadge } from "@/components/status-badge";
import { StatusTag } from "@/components/status-tag";
import { formatDateTime, formatFee } from "@/lib/format";
import { socialingPhotoUrl, type SocialingCardData } from "@/lib/queries/socialings";

// DESIGN.md socialing-card/photo · no-photo (spec 8.5). 홈·탐색·지난 소셜링 목록에 쓴다. 테두리 없이 shadow-card.
// 내 소셜링(P06)은 같은 카드에 신청 칩(my-application)이나 아래 줄(후기 쓰기, 승인 대기 · 소셜링 관리)을 더한다.
// 왼쪽 96px 정사각 사진(없으면 카테고리 그림), 오른쪽 위에서부터
// ① 상태 배지 + 꼬리표(신청 마감·정원 마감·최소 인원까지 N명) ② 제목 1줄(700) ③ 카테고리(카테고리 색 600 + 6px 점) · 술 여부 ④ 소셜링 일시 · 장소
// ⑤ 호스트 · 참여 확정 인원/정원 · 총 참가비(700).
// 카드 전체가 상세로 가는 링크다(제목 링크를 카드 크기로 넓힘).

/** 카드 목록. 카드 사이 12px (DESIGN.md Layout) */
export function SocialingCardList({ socialings }: { socialings: SocialingCardData[] }) {
  return (
    <ul className="flex flex-col gap-sm">
      {socialings.map((socialing) => (
        <li key={socialing.id}>
          <SocialingCard socialing={socialing} />
        </li>
      ))}
    </ul>
  );
}

type SocialingCardProps = {
  socialing: SocialingCardData;
  /** 카드를 누르면 가는 곳. 기본은 상세(P03), 호스트 카드는 관리(P11) */
  href?: string;
  /** socialing-card/my-application: 내 신청 상태. status-badge 뒤에 놓인다 */
  chip?: ApplicationChipVariant;
  /** 구분선 아래 한 줄. 안의 버튼·링크는 카드 링크보다 위에 놓는다(relative z-10) */
  footer?: React.ReactNode;
};

export function SocialingCard({ socialing, href, chip, footer }: SocialingCardProps) {
  const place = socialing.venue_type === "branch" ? socialing.venue_name : socialing.region_sigungu;

  return (
    <article className="relative flex flex-col rounded-xl bg-surface p-md shadow-card has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-border-strong">
      <div className="flex gap-md">
        {socialing.cover_photo_path ? (
          // eslint-disable-next-line @next/next/no-img-element -- 올릴 때 이미 1MB 이하로 줄인 Storage 공개 사진
          <img
            src={socialingPhotoUrl(socialing.cover_photo_path)}
            alt=""
            className="size-24 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <CategoryArt slug={socialing.category_slug} className="size-24 shrink-0 rounded-lg" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-xxs">
          <div className="flex flex-wrap items-center gap-[6px]">
            <StatusBadge status={socialing.display_status} />
            <StatusTag socialing={socialing} />
            {chip && <ApplicationChip variant={chip} />}
          </div>
          <h2 className="mt-xxs truncate text-title-md font-bold text-text-primary">
            <Link
              href={href ?? `/socialings/${socialing.id}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {socialing.title}
            </Link>
          </h2>
          <p className="truncate text-body-sm text-text-secondary">
            <CategoryName slug={socialing.category_slug} name={socialing.category_name} />{" "}
            · {socialing.has_alcohol ? "술 있음" : "술 없음"}
          </p>
          <p className="truncate text-body-sm text-text-secondary">
            {formatDateTime(socialing.starts_at)} · {place}
          </p>
          <p className="flex min-w-0 items-center gap-xxs text-body-sm text-text-secondary">
            <AvatarInitial nickname={socialing.host_nickname} size={20} />
            <span className="truncate font-medium text-text-primary">{socialing.host_nickname}</span>
            <span aria-hidden>·</span>
            <span className="shrink-0">
              <span className="sr-only">참가자 </span>
              {socialing.accepted_count}/{socialing.capacity}명
            </span>
            <span aria-hidden>·</span>
            <span className="shrink-0 font-bold text-text-primary">{formatFee(socialing.fee)}</span>
          </p>
        </div>
      </div>
      {footer ? (
        <div className="mt-md flex min-h-9 items-center justify-between gap-sm border-t border-border-divider pt-sm">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
