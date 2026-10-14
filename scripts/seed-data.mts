// 데모 시드 데이터 정의 (spec 7장). 비밀값은 없다.
// 날짜는 모두 시드 실행 시점 기준 상대값으로 계산한다 (SP4).

import { REGION_ROWS } from "./regions.mts";

export const DEMO_EMAIL_DOMAIN = "socialing.test";

/** A·B는 시연 계정, C·D는 다른 호스트, P1~P5는 기록·후기를 만드는 참여자 */
export type DemoUserKey = "A" | "B" | "C" | "D" | "P1" | "P2" | "P3" | "P4" | "P5";

/** 데모 계정. 이메일은 실제로 메일이 가지 않는 주소(.test)다. */
export const DEMO_USERS: Record<DemoUserKey, { email: string; nickname: string }> = {
  A: { email: `seoyun@${DEMO_EMAIL_DOMAIN}`, nickname: "서윤" }, // 참여자 (시연)
  B: { email: `dohyun@${DEMO_EMAIL_DOMAIN}`, nickname: "도현" }, // 호스트 (시연), 등급 조건 충족
  C: { email: `harin@${DEMO_EMAIL_DOMAIN}`, nickname: "하린" }, // 새 호스트
  D: { email: `junho@${DEMO_EMAIL_DOMAIN}`, nickname: "준호" }, // 기록 숫자만, 등급 없음
  P1: { email: `minji@${DEMO_EMAIL_DOMAIN}`, nickname: "민지" },
  P2: { email: `taeyun@${DEMO_EMAIL_DOMAIN}`, nickname: "태윤" },
  P3: { email: `sora@${DEMO_EMAIL_DOMAIN}`, nickname: "소라" },
  P4: { email: `jihun@${DEMO_EMAIL_DOMAIN}`, nickname: "지훈" },
  P5: { email: `yerin@${DEMO_EMAIL_DOMAIN}`, nickname: "예린" },
};

export const CATEGORIES = [
  { slug: "learning", name: "배움·자기계발", sort_order: 1, is_party: false },
  { slug: "hobby", name: "취미", sort_order: 2, is_party: false },
  { slug: "activity", name: "운동·활동", sort_order: 3, is_party: false },
  { slug: "culture", name: "문화·예술", sort_order: 4, is_party: false },
  { slug: "party", name: "파티·사교", sort_order: 5, is_party: true },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

/**
 * 지역: 시·도 > 시·군·구. 코드는 법정동코드 시·군·구 앞 5자리.
 * 전국 목록은 scripts/regions.mts (공공데이터포털 법정동 파일에서 node scripts/build-regions.mts로 만든다, decisions.md).
 */
export const REGIONS: { code: string; sido: string; sigungu: string }[] = REGION_ROWS.map(([code, sido, sigungu]) => ({
  code,
  sido,
  sigungu,
}));

/** 가상 스터디지점 3곳 + 외부 장소(실제 구 이름 + 가상 장소명). 서울 몇 개 구에 모은다 (spec 7장) */
export const VENUES = [
  { key: "gangnam", type: "branch", name: "강남점", region: "11680", address_text: "서울 강남구 (가상 지점)" },
  { key: "hongdae", type: "branch", name: "홍대점", region: "11440", address_text: "서울 마포구 (가상 지점)" },
  { key: "seongsu", type: "branch", name: "성수점", region: "11200", address_text: "서울 성동구 (가상 지점)" },
  { key: "yeonnam_cafe", type: "external", name: "연남 작은책방 카페", region: "11440", address_text: "서울 마포구 (가상 장소)" },
  { key: "seongsu_studio", type: "external", name: "성수 공방 스튜디오", region: "11200", address_text: "서울 성동구 (가상 장소)" },
  { key: "yeoksam_lounge", type: "external", name: "역삼 라운지 17층", region: "11680", address_text: "서울 강남구 (가상 장소)" },
  { key: "jamsil_court", type: "external", name: "잠실 한강 러닝 코스 입구", region: "11710", address_text: "서울 송파구 (가상 장소)" },
] as const satisfies readonly { key: string; type: "branch" | "external"; name: string; region: string; address_text: string }[];

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
  reviews?: SeedReview[];
};

/** 인증 후기. checks는 비공개 확인 질문 [참가자 구성이 같았나, 추가로 돈을 요구받았나, 진행 내용이 같았나] */
export type SeedReview = {
  user: DemoUserKey;
  body: string;
  created_at: string;
  checks: [membersMatch: boolean, extraMoney: boolean, contentMatch: boolean];
};

/** 소개와 일치하는 응답 (①예 ②아니오 ③예) */
const MATCH: SeedReview["checks"] = [true, false, true];

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

const accepted = (users: DemoUserKey[], created_at: string) =>
  users.map((user) => ({ user, status: "accepted" as const, created_at }));

/** 지난 종료 소셜링 (호스트 기록용). daysAgo일 전 19:30에 열리고 22:00에 종료 */
function completedSocialing(
  now: Date,
  s: Omit<SeedSocialing, "starts_at" | "apply_deadline_at" | "status" | "confirmed_at" | "completed_at" | "applications" | "reviews"> & {
    daysAgo: number;
    participants: DemoUserKey[];
    reviews?: (Omit<SeedReview, "created_at"> & { daysAfter?: number })[];
  },
): SeedSocialing {
  const { daysAgo, participants, reviews = [], ...rest } = s;
  return {
    ...rest,
    starts_at: seoulDateAt(-daysAgo, 19, 30, now),
    apply_deadline_at: seoulDateAt(-daysAgo - 1, 23, 0, now),
    status: "completed",
    confirmed_at: seoulDateAt(-daysAgo - 2, 12, 0, now),
    completed_at: seoulDateAt(-daysAgo, 22, 0, now),
    applications: accepted(participants, seoulDateAt(-daysAgo - 5, 20, 0, now)),
    reviews: reviews.map(({ daysAfter = 1, ...review }) => ({
      ...review,
      created_at: seoulDateAt(-daysAgo + daysAfter, 10, 0, now),
    })),
  };
}

/** spec 7장 "시드가 반드시 만드는 것" 전부. 시연 핵심 3개(demoSocialings)를 포함한다 */
export function seedSocialings(now = new Date()): SeedSocialing[] {
  const demo = demoSocialings(now);
  const X = demo.find((d) => d.key === "X")!;
  // X에는 A 말고도 참여 확정자를 둔다 (A가 후기를 쓰는 소셜링)
  X.applications.push(...accepted(["P1", "P2"], seoulDateAt(-5, 9, 0, now)));

  return [
    ...demo,

    // ---------------------------------------------------------------- 현재 소셜링 (일시 미래)
    {
      key: "B_RECRUITING_SOON",
      host: "B",
      title: "아침 7시 영어 일기 쓰기",
      description: "출근 전에 영어로 짧은 일기를 쓰고, 서로 한 문장씩 고쳐 줘요.\n노트북이나 공책을 챙겨 오세요.",
      category: "learning",
      has_alcohol: false,
      venue: "seongsu",
      starts_at: seoulDateAt(1, 7, 0, now),
      // 마감을 시드 당일 밤으로 두면 밤 11시 뒤에 시드를 넣거나 점검할 때 이미 마감이라 홈 히어로가 바뀐다 → 시작 1시간 전
      apply_deadline_at: seoulDateAt(1, 6, 0, now),
      fee: 8000,
      capacity: 8,
      staff_count: 0,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P3", "P4"], seoulDateAt(-2, 21, 0, now)),
    },
    {
      key: "D_CONFIRMED",
      host: "D",
      title: "엑셀 함수 기초: 업무 자동화 첫걸음",
      description: "VLOOKUP, IF, 피벗 테이블을 예제 파일로 직접 따라 해요.\n노트북이 꼭 필요해요.",
      category: "learning",
      has_alcohol: false,
      venue: "yeoksam_lounge",
      starts_at: seoulDateAt(2, 19, 30, now),
      apply_deadline_at: seoulDateAt(1, 23, 0, now),
      fee: 20000,
      capacity: 6,
      staff_count: 1,
      join_type: "first_come",
      status: "confirmed",
      confirmed_at: seoulDateAt(-1, 12, 0, now),
      applications: accepted(["P1", "P3", "P5"], seoulDateAt(-4, 20, 0, now)),
    },
    {
      // 꼬리표 "신청 마감": 신청 마감 일시는 지났고 소셜링 일시는 미래
      key: "C_DEADLINE_PASSED",
      host: "C",
      title: "작은 전시 함께 보고 이야기 나누기",
      description: "동네 갤러리의 작은 전시를 함께 보고, 근처 카페에서 감상을 나눠요.",
      category: "culture",
      has_alcohol: false,
      venue: "yeonnam_cafe",
      starts_at: hoursFromNow(20, now),
      apply_deadline_at: hoursFromNow(-2, now),
      fee: 10000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P2"], seoulDateAt(-3, 20, 0, now)),
    },
    {
      // 꼬리표 "정원 마감": 참여 확정 인원 = 정원
      key: "D_FULL",
      host: "D",
      title: "한강 5km 가볍게 달리기",
      description: "천천히 달리는 페이스(7분/km)로 5km를 함께 뛰어요.\n끝나고 스트레칭까지 같이 해요.",
      category: "activity",
      has_alcohol: false,
      venue: "jamsil_court",
      starts_at: seoulDateAt(5, 7, 30, now),
      apply_deadline_at: seoulDateAt(4, 22, 0, now),
      fee: 0,
      capacity: 4,
      staff_count: 0,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P1", "P2", "P3", "P4"], seoulDateAt(-1, 20, 0, now)),
    },
    {
      key: "C_ONE_SEAT_LEFT",
      host: "C",
      title: "독서 소셜링: 이번 달 에세이 한 권",
      description: "정해진 에세이 한 권을 읽고 와서 인상 깊은 문장을 나눠요.\n다 못 읽어도 괜찮아요.",
      category: "learning",
      has_alcohol: false,
      venue: "hongdae",
      starts_at: seoulDateAt(6, 14, 0, now),
      apply_deadline_at: seoulDateAt(5, 23, 0, now),
      fee: 10000,
      capacity: 3,
      staff_count: 0,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P4", "P5"], seoulDateAt(-1, 21, 0, now)),
    },
    {
      key: "D_PARTY",
      host: "D",
      title: "보드게임과 와인 한 잔",
      description: "가벼운 보드게임 3종을 돌아가며 해요. 와인과 간단한 안주가 준비돼 있어요.\n처음 오신 분도 규칙부터 알려 드려요.",
      category: "party",
      has_alcohol: true,
      venue: "seongsu_studio",
      starts_at: seoulDateAt(3, 20, 0, now),
      apply_deadline_at: seoulDateAt(3, 12, 0, now),
      fee: 25000,
      capacity: 10,
      staff_count: 1,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P2", "P5"], seoulDateAt(-2, 22, 0, now)),
    },
    {
      // 호스트 취소 (참여 확정자가 있던 상태라 D의 "호스트 취소 1회"로 센다)
      key: "D_CANCELED",
      host: "D",
      title: "수제 맥주 펍 투어",
      description: "성수 근처 펍 두 곳을 돌며 수제 맥주를 맛봐요.",
      category: "party",
      has_alcohol: true,
      venue: "seongsu_studio",
      starts_at: seoulDateAt(3, 19, 0, now),
      apply_deadline_at: seoulDateAt(2, 23, 0, now),
      fee: 30000,
      capacity: 8,
      staff_count: 0,
      join_type: "first_come",
      status: "canceled",
      canceled_at: seoulDateAt(-1, 18, 0, now),
      applications: accepted(["P3"], seoulDateAt(-3, 20, 0, now)),
    },
    {
      key: "C_HOBBY",
      host: "C",
      title: "필름 카메라로 골목 산책",
      description: "필름 카메라나 휴대폰 카메라로 연남동 골목을 걸으며 사진을 찍어요.",
      category: "hobby",
      has_alcohol: false,
      venue: "yeonnam_cafe",
      starts_at: seoulDateAt(8, 15, 0, now),
      apply_deadline_at: seoulDateAt(7, 23, 0, now),
      fee: 5000,
      capacity: 8,
      staff_count: 0,
      join_type: "approval",
      status: "recruiting",
      applications: [],
    },
    {
      key: "B_LEARNING_LATER",
      host: "B",
      title: "직장인 영어 프레젠테이션 연습",
      description: "회사에서 쓰는 발표 자료 한 장을 영어로 설명해 보고 표현을 다듬어요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      starts_at: seoulDateAt(10, 19, 30, now),
      apply_deadline_at: seoulDateAt(9, 23, 0, now),
      fee: 15000,
      capacity: 8,
      staff_count: 1,
      join_type: "first_come",
      status: "recruiting",
      applications: accepted(["P5"], seoulDateAt(-1, 9, 0, now)),
    },

    // ---------------------------------------------------------------- 지난 소셜링
    {
      // 확정하지 않은 채 소셜링 일시가 지남 (상태는 그대로 모집중)
      key: "C_EXPIRED_RECRUITING",
      host: "C",
      title: "캘리그라피 한 줄 써 보기",
      description: "붓펜으로 좋아하는 문장 한 줄을 써 봐요. 재료는 준비돼 있어요.",
      category: "hobby",
      has_alcohol: false,
      venue: "hongdae",
      starts_at: seoulDateAt(-1, 14, 0, now),
      apply_deadline_at: seoulDateAt(-2, 23, 0, now),
      fee: 12000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      status: "recruiting",
      applications: [],
    },

    // B: 열린 소셜링 6회(Y 포함), 호스트 취소 0회, 소개 일치 11/12 → "믿고 가는 호스트"
    completedSocialing(now, {
      key: "B_PAST_1",
      host: "B",
      title: "영어 회화: 주말 계획 말하기",
      description: "주말에 하고 싶은 일을 영어로 소개하고 질문을 주고받아요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      fee: 15000,
      capacity: 6,
      staff_count: 1,
      join_type: "first_come",
      daysAgo: 16,
      participants: ["A", "P1", "P2", "P3"],
      reviews: [
        { user: "A", body: "처음이라 긴장했는데 짝을 자주 바꿔서 금방 편해졌어요. 소개에 적힌 그대로 진행됐어요.", checks: MATCH },
        { user: "P1", body: "표현 카드가 실용적이었어요. 다음에도 참여하고 싶어요.", checks: MATCH },
        { user: "P2", body: "인원도 소개와 같았고 추가 비용도 없었어요. 시간 관리가 좋았어요.", checks: MATCH },
      ],
    }),
    completedSocialing(now, {
      key: "B_PAST_2",
      host: "B",
      title: "영어 회화: 좋아하는 음식 소개",
      description: "좋아하는 음식과 레시피를 영어로 설명해 봐요.",
      category: "learning",
      has_alcohol: false,
      venue: "hongdae",
      fee: 15000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      daysAgo: 30,
      participants: ["P3", "P4", "P5"],
      reviews: [
        { user: "P3", body: "호스트님이 모두에게 말할 기회를 골고루 줘서 좋았어요.", checks: MATCH },
        { user: "P4", body: "생각보다 어려웠지만 피드백이 친절했어요. 내용은 소개와 같았어요.", checks: MATCH },
      ],
    }),
    completedSocialing(now, {
      key: "B_PAST_3",
      host: "B",
      title: "영어 원서 한 챕터 같이 읽기",
      description: "쉬운 영어 원서 한 챕터를 소리 내어 읽고 줄거리를 이야기해요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      fee: 12000,
      capacity: 6,
      staff_count: 0,
      join_type: "approval",
      approval_criteria: "원서를 미리 한 번 읽어 올 수 있는 분",
      daysAgo: 45,
      participants: ["P1", "P2", "P5"],
      reviews: [
        { user: "P1", body: "미리 읽어 오라는 안내가 있어서 대화가 깊어졌어요.", checks: MATCH },
        { user: "P5", body: "참가자 구성이 소개와 조금 달랐지만 진행은 좋았어요.", checks: [false, false, true] },
      ],
    }),
    completedSocialing(now, {
      key: "B_PAST_4",
      host: "B",
      title: "영어 면접 질문 연습",
      description: "자주 나오는 영어 면접 질문 10개로 짝 연습을 해요.",
      category: "learning",
      has_alcohol: false,
      venue: "seongsu",
      fee: 15000,
      capacity: 8,
      staff_count: 1,
      join_type: "first_come",
      daysAgo: 70,
      participants: ["P2", "P3", "P4"],
      reviews: [
        { user: "P2", body: "실제 면접처럼 시간을 재서 연습하니 도움이 많이 됐어요.", checks: MATCH },
        { user: "P3", body: "추가로 돈을 내라는 일도 없었고 소개대로 진행됐어요.", checks: MATCH },
        { user: "P4", body: "질문 목록을 나눠 줘서 집에서도 복습할 수 있었어요.", checks: MATCH },
      ],
    }),
    completedSocialing(now, {
      key: "B_PAST_5",
      host: "B",
      title: "영어 팟캐스트 듣고 요약하기",
      description: "10분짜리 영어 팟캐스트를 듣고 세 문장으로 요약해 봐요.",
      category: "learning",
      has_alcohol: false,
      venue: "gangnam",
      fee: 10000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      daysAgo: 100,
      participants: ["P4", "P5"],
      reviews: [
        { user: "P4", body: "듣기가 약했는데 요약 연습 방식이 좋았어요.", checks: MATCH },
        { user: "P5", body: "소개에 적힌 내용 그대로였고 분위기도 편했어요.", checks: MATCH },
      ],
    }),

    // C: 열린 소셜링 1회 → "새 호스트"
    completedSocialing(now, {
      key: "C_PAST_1",
      host: "C",
      title: "동네 서점 둘러보기",
      description: "연남동 독립 서점 두 곳을 둘러보고 한 권씩 골라 소개해요.",
      category: "culture",
      has_alcohol: false,
      venue: "yeonnam_cafe",
      fee: 5000,
      capacity: 6,
      staff_count: 0,
      join_type: "first_come",
      daysAgo: 25,
      participants: ["P1", "P3"],
      reviews: [{ user: "P1", body: "처음 여는 소셜링이라고 하셨는데 준비가 꼼꼼했어요.", checks: MATCH }],
    }),

    // D: 열린 소셜링 3회 + 호스트 취소 1회, 응답 3건(5건 미만) → 숫자만, 등급 없음
    completedSocialing(now, {
      key: "D_PAST_1",
      host: "D",
      title: "엑셀 단축키 30분 정리",
      description: "업무에서 자주 쓰는 엑셀 단축키를 함께 정리해요.",
      category: "learning",
      has_alcohol: false,
      venue: "yeoksam_lounge",
      fee: 15000,
      capacity: 8,
      staff_count: 0,
      join_type: "first_come",
      daysAgo: 20,
      participants: ["P2", "P4"],
      reviews: [{ user: "P2", body: "단축키 표를 받아서 바로 써먹고 있어요.", checks: MATCH }],
    }),
    completedSocialing(now, {
      key: "D_PAST_2",
      host: "D",
      title: "한강 야간 걷기 7km",
      description: "해가 진 뒤 한강을 따라 7km를 걸어요.",
      category: "activity",
      has_alcohol: false,
      venue: "jamsil_court",
      fee: 0,
      capacity: 10,
      staff_count: 1,
      join_type: "first_come",
      daysAgo: 40,
      participants: ["P1", "P3", "P5"],
      reviews: [{ user: "P3", body: "코스 안내가 정확했고 걷는 속도도 적당했어요.", checks: MATCH }],
    }),
    completedSocialing(now, {
      key: "D_PAST_3",
      host: "D",
      title: "와인 입문: 세 가지 맛 비교",
      description: "레드 와인 세 가지를 맛보며 차이를 이야기해요.",
      category: "party",
      has_alcohol: true,
      venue: "seongsu_studio",
      fee: 35000,
      capacity: 8,
      staff_count: 0,
      join_type: "first_come",
      daysAgo: 60,
      participants: ["P4", "P5"],
      reviews: [
        { user: "P4", body: "와인 설명은 좋았는데 안주 값을 따로 냈어요.", checks: [true, true, true] },
      ],
    }),
  ];
}

// --------------------------------------------------------------------------- 호스트 기록 (architecture 3.2)

export type HostRecord = {
  opened: number;
  canceled: number;
  responses: number;
  matchRate: number | null;
  reviews: number;
  isNewHost: boolean;
  isTrusted: boolean;
};

/**
 * 시드 정의만으로 호스트 기록을 계산한다(시드 조건 점검용).
 * 실제 화면 값은 MS6의 DB 집계 함수가 같은 규칙으로 계산한다.
 */
export function hostRecordFromSeed(socialings: SeedSocialing[], host: DemoUserKey, now = new Date()): HostRecord {
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const mine = socialings.filter((s) => s.host === host && new Date(s.starts_at) >= sixMonthsAgo);

  const opened = mine.filter((s) => s.status === "completed" && s.applications.some((a) => a.status === "accepted")).length;
  const canceled = mine.filter(
    (s) => s.status === "canceled" && s.applications.some((a) => a.status === "accepted" || a.status === "pending"),
  ).length;
  const allReviews = mine.flatMap((s) => s.reviews ?? []);
  const matches = allReviews.filter((r) => r.checks[0] && !r.checks[1] && r.checks[2]).length;
  const responses = allReviews.length;
  const matchRate = responses >= 5 ? matches / responses : null;

  return {
    opened,
    canceled,
    responses,
    matchRate,
    reviews: allReviews.length,
    isNewHost: opened < 3,
    isTrusted: opened >= 5 && canceled === 0 && matchRate !== null && matchRate >= 0.9,
  };
}
