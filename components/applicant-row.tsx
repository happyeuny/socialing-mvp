import { ApplicationChip, chipVariantOf } from "@/components/application-chip";
import { AvatarInitial } from "@/components/avatar-initial";
import { formatMonthDayTime } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/queries/socialings";
import { cn } from "@/lib/utils";

// DESIGN.md applicant-row. 소셜링 관리(P11) 신청자 한 줄: avatar-initial 40, 닉네임, "10/12 오전 8:40 신청", 아래 구분선.
// pending: 높이 72, 오른쪽에 승인·거절 버튼(actions). accepted · rejected: 높이 64, 오른쪽에 application-chip.

type Props = {
  nickname: string;
  appliedAt: string;
  status: ApplicationStatus;
  /** 승인 대기 행의 버튼 자리 */
  actions?: React.ReactNode;
  /** 버튼이 막힌 이유 등, 행 아래 줄 */
  note?: React.ReactNode;
};

export function ApplicantRow({ nickname, appliedAt, status, actions, note }: Props) {
  return (
    <li
      className={cn(
        "flex flex-col justify-center gap-xxs border-b border-border-divider py-sm",
        status === "pending" ? "min-h-[72px]" : "min-h-16",
      )}
    >
      <div className="flex items-center gap-sm">
        <AvatarInitial nickname={nickname} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-title-md text-text-primary">{nickname}</p>
          <p className="text-body-sm text-text-secondary">{formatMonthDayTime(appliedAt)} 신청</p>
        </div>
        {status === "pending" ? actions : <ApplicationChip variant={chipVariantOf(status)} />}
      </div>
      {note}
    </li>
  );
}
