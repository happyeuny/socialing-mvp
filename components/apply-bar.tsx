import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/button";
import type { ClosedReason, SocialingDetail } from "@/lib/queries/socialings";
import { withNext } from "@/lib/routes";
import { cn } from "@/lib/utils";

// DESIGN.md C4 apply-bar: 상세 맨 아래에 붙는 영역. spec 8.4 표의 위에서부터 먼저 맞는 줄 하나만 보인다.
// 신청 가능 여부와 이유는 DB(socialing_summaries)가 계산한 값을 그대로 쓴다.
// 지금 있는 줄: 2(호스트 취소), 11(신청하기 → 로그인 → 상세 복귀), 13(신청 마감·정원 마감·지난 소셜링).
// 호스트 본인(1), 신청자(3~10), 로그인한 사람의 신청(12)은 MS3·MS4에서 이 순서 안에 끼운다. 그때까지 로그인한 사람도 같은 줄을 본다.

const JOIN_GUIDE = {
  approval: "신청하면 호스트가 승인한 뒤 참여가 확정돼요",
  first_come: "신청하면 바로 참여가 확정돼요",
} as const;

// 13줄 버튼 글자와 이유. 종료는 소셜링 일시 뒤에만 되므로 not_open은 실제로 started와 같다.
const CLOSED: Record<Exclude<ClosedReason, "host_canceled">, { button: string; reason: string }> = {
  full: { button: "정원 마감", reason: "참여 확정 인원이 정원에 찼어요" },
  deadline: { button: "신청 마감", reason: "신청 마감 일시가 지났어요" },
  started: { button: "지난 소셜링", reason: "소셜링 일시가 지났어요" },
  not_open: { button: "지난 소셜링", reason: "소셜링 일시가 지났어요" },
};

export function ApplyBar({ socialing }: { socialing: SocialingDetail }) {
  // 2줄: 호스트 취소
  if (socialing.closed_reason === "host_canceled") {
    return (
      <Shell>
        <Button variant="danger" size="lg" className="w-full" disabled>
          호스트 취소
        </Button>
        <Guide>호스트가 취소한 소셜링이에요</Guide>
        <OtherSocialingsLink />
      </Shell>
    );
  }

  // 11줄: 비로그인 신청하기 → 로그인 → 상세로 돌아와 한 번 더 누른다 (자동 신청 없음, spec 8.9)
  if (socialing.can_apply) {
    return (
      <Shell>
        <Guide>{JOIN_GUIDE[socialing.join_type]}</Guide>
        <Link
          href={withNext("/login", `/socialings/${socialing.id}`)}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
        >
          신청하기
        </Link>
      </Shell>
    );
  }

  // 13줄: 신청 마감 / 정원 마감 / 지난 소셜링
  const closed = CLOSED[(socialing.closed_reason ?? "started") as keyof typeof CLOSED];
  return (
    <Shell>
      <Button variant="primary" size="lg" className="w-full" disabled>
        {closed.button}
      </Button>
      <Guide>{closed.reason}</Guide>
      <OtherSocialingsLink />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="신청"
      data-toast-anchor
      className="sticky bottom-0 z-10 flex flex-col items-center gap-xs border-t border-border-default bg-surface px-md pt-sm pb-[calc(12px+env(safe-area-inset-bottom))] shadow-up"
    >
      {children}
    </section>
  );
}

function Guide({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-body-sm text-text-secondary">{children}</p>;
}

function OtherSocialingsLink() {
  return (
    <Link href="/explore" className={cn(buttonVariants({ variant: "text-link", size: "inline" }), "-my-xs")}>
      다른 소셜링 보기
      <ChevronRight className="-ml-1 size-4" aria-hidden />
    </Link>
  );
}
