// 데모 시드 데이터 정의 (spec 7장). 비밀값은 없다.
// 날짜는 모두 시드 실행 시점 기준 상대값으로 계산한다 (SP4).

export const DEMO_EMAIL_DOMAIN = "socialing.test";

export type DemoUserKey = "A" | "B";

/** 데모 계정. 이메일은 실제로 메일이 가지 않는 주소(.test)다. */
export const DEMO_USERS: Record<DemoUserKey, { email: string; nickname: string }> = {
  A: { email: `seoyun@${DEMO_EMAIL_DOMAIN}`, nickname: "서윤" }, // 참여자
  B: { email: `dohyun@${DEMO_EMAIL_DOMAIN}`, nickname: "도현" }, // 호스트
};

export const CATEGORIES = [
  { slug: "learning", name: "배움·자기계발", sort_order: 1, is_party: false },
  { slug: "hobby", name: "취미", sort_order: 2, is_party: false },
  { slug: "activity", name: "운동·활동", sort_order: 3, is_party: false },
  { slug: "culture", name: "문화·예술", sort_order: 4, is_party: false },
  { slug: "party", name: "파티·사교", sort_order: 5, is_party: true },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

/** 행정 코드는 법정동코드 시·군·구 앞 5자리. 전국 목록은 시드 전체 PR에서 넣는다. */
export const REGIONS = [
  { code: "11680", sido: "서울특별시", sigungu: "강남구" },
  { code: "11440", sido: "서울특별시", sigungu: "마포구" },
  { code: "11200", sido: "서울특별시", sigungu: "성동구" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];

/** 가상 스터디지점 3곳 (spec 7장) */
export const VENUES = [
  { key: "gangnam", type: "branch", name: "강남점", region: "11680", address_text: "서울 강남구 (가상 지점)" },
  { key: "hongdae", type: "branch", name: "홍대점", region: "11440", address_text: "서울 마포구 (가상 지점)" },
  { key: "seongsu", type: "branch", name: "성수점", region: "11200", address_text: "서울 성동구 (가상 지점)" },
] as const;

export type VenueKey = (typeof VENUES)[number]["key"];

/**
 * 시드 실행 시점 기준 상대 날짜.
 * 한국 시간으로 "오늘 + days일"의 hour:minute를 UTC ISO 문자열로 돌려준다.
 */
export function seoulDateAt(days: number, hour: number, minute = 0, now = new Date()): string {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, hour - 9, minute)).toISOString();
}

/** 지금부터 hours시간 뒤(음수면 전) */
export function hoursFromNow(hours: number, now = new Date()): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export type SeedSocialing = {
  key: string;
  host: DemoUserKey;
  title: string;
  description: string;
  category: CategorySlug;
  has_alcohol: boolean;
  venue: VenueKey;
  starts_at: string;
  apply_deadline_at: string;
  fee: number;
  capacity: number;
  staff_count: number;
  join_type: "first_come" | "approval";
  approval_criteria?: string;
  status: "recruiting" | "confirmed" | "completed" | "canceled";
  confirmed_at?: string;
  completed_at?: string;
  canceled_at?: string;
  applications: { user: DemoUserKey; status: "pending" | "accepted" | "rejected" | "canceled"; created_at: string }[];
};

/** 시연에 꼭 필요한 소셜링 (spec 7장 "시드가 반드시 만드는 것" 중 데모 계정 A·B 부분) */
export function demoSocialings(now = new Date()): SeedSocialing[] {
  return [
    {
      // 7~9단계: 일시가 지난 확정 소셜링. B가 종료하고 A가 후기를 쓴다
      key: "X",
      host: "B",
      title: "퇴근 후 영어 회화: 여행 영어 롤플레이",
      description:
        "여행에서 자주 쓰는 표현을 짝을 바꿔 가며 롤플레이로 연습해요.\n공항, 호텔, 식당 상황 카드를 준비해 둘게요.\n실력보다 말해 보는 경험이 목표예요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      starts_at: seoulDateAt(-2, 19, 30, now),
      apply_deadline_at: seoulDateAt(-3, 23, 0, now),
      fee: 15000,
      capacity: 6,
      staff_count: 1,
      join_type: "first_come",
      status: "confirmed",
      confirmed_at: seoulDateAt(-4, 12, 0, now),
      applications: [{ user: "A", status: "accepted", created_at: seoulDateAt(-6, 21, 10, now) }],
    },
    {
      // 7~9단계 대체용: 이미 종료, A 참여 확정, 후기 없음
      key: "Y",
      host: "B",
      title: "영어 뉴스 한 편 같이 읽기",
      description: "짧은 영어 기사 한 편을 같이 읽고, 모르는 표현을 정리한 뒤 생각을 나눠요.",
      category: "learning",
      has_alcohol: false,
      venue: "hongdae",
      starts_at: seoulDateAt(-9, 19, 30, now),
      apply_deadline_at: seoulDateAt(-10, 23, 0, now),
      fee: 12000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      status: "completed",
      confirmed_at: seoulDateAt(-11, 12, 0, now),
      completed_at: seoulDateAt(-9, 22, 0, now),
      applications: [{ user: "A", status: "accepted", created_at: seoulDateAt(-13, 20, 0, now) }],
    },
    {
      // 4~6단계: 호스트 승인, 모집중, 일시 미래, 승인 기준 있음. A가 신청한다
      key: "APPROVAL",
      host: "B",
      title: "영어로 내 일 소개하기: 3분 스피치",
      description:
        "각자 하는 일을 영어로 3분 동안 소개하고, 서로 질문을 주고받아요.\n스피치 원고는 미리 써 오면 좋아요.\n끝나고 표현 피드백을 정리해서 나눠 드려요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      starts_at: seoulDateAt(4, 19, 30, now),
      apply_deadline_at: seoulDateAt(3, 23, 0, now),
      fee: 15000,
      capacity: 6,
      staff_count: 1,
      join_type: "approval",
      approval_criteria: "영어로 3분 정도 자기소개를 할 수 있는 분이면 좋아요. 신청 순서대로 확인해요.",
      status: "recruiting",
      applications: [],
    },
  ];
}
