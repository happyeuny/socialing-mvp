import { CollapsibleRow } from "@/components/collapsible-row";
import { NoticeBox } from "@/components/notice-box";
import { formatMonthDayWeekday } from "@/lib/format";
import type { ParticipationRecord } from "@/lib/queries/my-socialings";

// DESIGN.md participation-record (MS15 SH2, spec M11, 04 4.3). 내 소셜링(P06) "신청한 소셜링" 탭 맨 위, 나만 보는 참여 기록.
// notice-box/info 틀: 제목 "내 참여 기록 · 나만 볼 수 있어요", 숫자 한 줄("새 멤버 · 참여 2회 · 늦은 취소 1회"), 기준 문구.
// 늦은 취소가 있으면 접는 줄(collapsible-row) "늦은 취소 기록 보기": "제목 · 10/12(월) 취소 · 4/14(수)에 기록에서 빠져요".
// 제목은 상세로 가지 않는다(신청 취소한 소셜링은 내 소셜링 목록에서 빠지는 규칙과 맞춤). 숫자는 DB 함수가 센 값 그대로.

export function ParticipationRecordBox({ record }: { record: ParticipationRecord }) {
  const counts = [
    record.isNewMember ? "새 멤버" : null,
    `참여 ${record.participatedCount}회`,
    `늦은 취소 ${record.lateCancelCount}회`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label="내 참여 기록">
      <NoticeBox variant="info" title="내 참여 기록 · 나만 볼 수 있어요">
        <div className="flex flex-col gap-xxs whitespace-normal">
          <p className="font-medium text-text-primary">{counts}</p>
          <p className="text-body-sm break-keep text-text-secondary">
            최근 6개월 · 신청 마감 뒤에 참여 확정을 취소하면 늦은 취소예요
          </p>
          {record.lateCancels.length > 0 && (
            <CollapsibleRow title="늦은 취소 기록 보기">
              <ul aria-label="늦은 취소 기록" className="flex flex-col gap-xs">
                {record.lateCancels.map((item) => (
                  <li
                    key={`${item.socialing_id}-${item.canceled_at}`}
                    className="text-body-sm break-words break-keep text-text-primary"
                  >
                    {item.title} · {formatMonthDayWeekday(item.canceled_at)} 취소 ·{" "}
                    {formatMonthDayWeekday(item.expires_at)}에 기록에서 빠져요
                  </li>
                ))}
              </ul>
            </CollapsibleRow>
          )}
        </div>
      </NoticeBox>
    </section>
  );
}
