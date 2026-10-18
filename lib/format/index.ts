// 화면에 보이는 날짜·금액 (spec 6장). 날짜는 언제나 한국 시간으로 계산한다(서버가 어느 시간대에 있든).

const dateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** 예: `10/14(화) 오후 7:30` */
export function formatDateTime(value: string | Date): string {
  const parts = Object.fromEntries(
    dateTimeFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.month}/${parts.day}(${parts.weekday}) ${parts.dayPeriod} ${parts.hour}:${parts.minute}`;
}

const monthDayFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

/** 예: `10/12` (후기 날짜) */
export function formatMonthDay(value: string | Date): string {
  const parts = Object.fromEntries(
    monthDayFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.month}/${parts.day}`;
}

const monthDayWeekdayFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

/** 예: `10/12(월)` (내 참여 기록의 늦은 취소 날짜, MS15 SH2) */
export function formatMonthDayWeekday(value: string | Date): string {
  const parts = Object.fromEntries(
    monthDayWeekdayFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.month}/${parts.day}(${parts.weekday})`;
}

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 일광 절약 시간이 없어 언제나 UTC+9
const SEOUL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** 일시 → 날짜·시간 고르기 칸(`datetime-local`) 값. 한국 시간, 분까지. 예: `2026-10-24T19:30` */
export function toSeoulInput(value: string | Date): string {
  return new Date(new Date(value).getTime() + SEOUL_OFFSET_MS).toISOString().slice(0, 16);
}

/** 날짜·시간 고르기 칸 값(한국 시간) → ISO 문자열. 형식이 아니면 null */
export function seoulInputToIso(value: string): string | null {
  if (!SEOUL_INPUT.test(value)) return null;
  const ms = Date.parse(`${value}:00+09:00`);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

const wonFormat = new Intl.NumberFormat("ko-KR");

/** 총 참가비. 예: `15,000원`, 0원이면 `무료` */
export function formatFee(fee: number): string {
  return fee === 0 ? "무료" : `${wonFormat.format(fee)}원`;
}

/** 연령 조건 (SH1b, 만 나이). 둘 다 `20~39세`, 최소만 `30세 이상`, 최대만 `39세 이하`, 조건 없음 null */
export function formatAgeRange(minAge: number | null, maxAge: number | null): string | null {
  if (minAge !== null && maxAge !== null) return `${minAge}~${maxAge}세`;
  if (minAge !== null) return `${minAge}세 이상`;
  if (maxAge !== null) return `${maxAge}세 이하`;
  return null;
}

/** 자료 링크의 사이트 이름 (SH3, 누르기 전에 어디로 가는지). 예: `ko.wikipedia.org`. 읽을 수 없는 주소면 null */
export function linkHost(url: string): string | null {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname ? hostname : null;
  } catch {
    return null;
  }
}

const monthDayTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** 예: `10/12 오전 8:40` (소셜링 관리의 신청 일시) */
export function formatMonthDayTime(value: string | Date): string {
  const parts = Object.fromEntries(
    monthDayTimeFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  );
  return `${parts.month}/${parts.day} ${parts.dayPeriod} ${parts.hour}:${parts.minute}`;
}

/** 장소 이름. 스터디지점이면 `스터디지점 강남점`, 외부 장소는 이름 그대로 (상세·관리) */
export function formatVenue(venueType: "branch" | "external", venueName: string): string {
  return venueType === "branch" ? `스터디지점 ${venueName}` : venueName;
}

const SIDO_SHORT: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전남광주통합특별시: "전남광주",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};

/** 시·도 짧은 이름: `서울특별시` → `서울`, `경상남도` → `경남`. 목록에 없는 이름은 그대로 */
export function shortSido(sido: string): string {
  return SIDO_SHORT[sido] ?? sido;
}
