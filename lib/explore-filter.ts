// 탐색(P01) 필터와 "파티·사교 숨기기" (spec M2, M3, 6장 날짜 필터, 8.7).
// 값은 주소(`/explore?…`)에 담고, 서버 목록과 필터 시트의 "소셜링 N개 보기"가 같은 함수로 거른다(목록과 숫자가 늘 같게).
// 화면 표시와 같이 날짜는 한국 시간으로 계산한다. 서버·브라우저 어디서 불러도 같은 결과다.
//
// 주소: /explore?category=learning,hobby&date=week&branch=1&region=11440&hide_party=1
//   category   카테고리 slug 여러 개(쉼표)
//   date       today · week · weekend
//   branch     스터디지점 venue id 또는 all(전체 지점)
//   region     지역 법정동코드: 2자리 = 시·도 전체, 5자리 = 시·군·구. 그 지역의 스터디지점과 외부 장소를 모두 거른다
//   hide_party 1 = 파티·사교 숨기기. 카테고리에 파티·사교를 고르면 꺼진다
// 알 수 없는 값은 무시한다. branch와 region이 함께 오면 branch를 쓴다.

export const DATE_FILTERS = ["today", "week", "weekend"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "오늘",
  week: "이번 주",
  weekend: "이번 주말",
};

export type PlaceFilter = { kind: "branch"; branchId: number | "all" } | { kind: "region"; code: string };

export type ExploreFilter = {
  categories: string[];
  date: DateFilter | null;
  place: PlaceFilter | null;
  hideParty: boolean;
};

export const EMPTY_FILTER: ExploreFilter = { categories: [], date: null, place: null, hideParty: false };

/** 필터에 쓰는 목록: 카테고리(파티·사교 여부), 스터디지점, 지역 */
export type FilterCatalog = {
  categories: { slug: string; name: string; isParty: boolean }[];
  branches: { id: number; name: string; sido: string; sigungu: string }[];
  regions: { code: string; sido: string; sigungu: string }[];
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseExploreFilter(params: Params, catalog: FilterCatalog): ExploreFilter {
  const raw = Array.isArray(params.category) ? params.category.join(",") : (params.category ?? "");
  const wanted = new Set(raw.split(",").map((slug) => slug.trim()));
  // 카테고리 순서(spec 6장)대로, 아는 것만
  const categories = catalog.categories.map((c) => c.slug).filter((slug) => wanted.has(slug));

  const dateValue = first(params.date);
  const date = DATE_FILTERS.find((d) => d === dateValue) ?? null;

  let place: PlaceFilter | null = null;
  const branch = first(params.branch);
  const region = first(params.region);
  if (branch === "all") place = { kind: "branch", branchId: "all" };
  else if (branch && catalog.branches.some((b) => String(b.id) === branch)) place = { kind: "branch", branchId: Number(branch) };
  else if (region && /^\d{2}$|^\d{5}$/.test(region) && catalog.regions.some((r) => r.code.startsWith(region))) {
    place = { kind: "region", code: region };
  }

  const hasParty = categories.some((slug) => catalog.categories.find((c) => c.slug === slug)?.isParty);
  const hideParty = first(params.hide_party) === "1" && !hasParty;

  return { categories, date, place, hideParty };
}

/** 필터를 주소의 `?…`로 (값이 없으면 빈 문자열) */
export function exploreSearch(filter: ExploreFilter): string {
  const parts: string[] = [];
  if (filter.categories.length > 0) parts.push(`category=${filter.categories.join(",")}`);
  if (filter.date) parts.push(`date=${filter.date}`);
  if (filter.place?.kind === "branch") parts.push(`branch=${filter.place.branchId}`);
  if (filter.place?.kind === "region") parts.push(`region=${filter.place.code}`);
  if (filter.hideParty) parts.push("hide_party=1");
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** 필터나 토글이 하나라도 걸려 있는지 (결과 0일 때 "조건에 맞는 소셜링이 없어요" + 필터 초기화) */
export function hasAnyFilter(filter: ExploreFilter): boolean {
  return filter.categories.length > 0 || filter.date !== null || filter.place !== null || filter.hideParty;
}

/** 토글을 켜고 끈 필터. 켤 때 카테고리에 파티·사교가 있으면 그것만 뺀다 */
export function withHideParty(filter: ExploreFilter, hideParty: boolean, catalog: FilterCatalog): ExploreFilter {
  const partySlugs = new Set(catalog.categories.filter((c) => c.isParty).map((c) => c.slug));
  return {
    ...filter,
    hideParty,
    categories: hideParty ? filter.categories.filter((slug) => !partySlugs.has(slug)) : filter.categories,
  };
}

// --------------------------------------------------------------------------- 날짜 (한국 시간)

const seoulDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 한국 날짜 y-m-d에서 days일 뒤의 0시(한국 시간) */
function seoulMidnight(year: number, month: number, day: number, days: number): Date {
  return new Date(Date.UTC(year, month - 1, day + days, -9));
}

/**
 * 날짜 필터의 범위 [start, end) (spec 6장, 한국 시간)
 * 오늘 = 오늘 0시~24시, 이번 주 = 오늘부터 이번 주 일요일 끝까지, 이번 주말 = 이번 주 토·일 (오늘이 일요일이면 오늘)
 */
export function dateFilterRange(kind: DateFilter, now: Date): { start: Date; end: Date } {
  const parts = Object.fromEntries(seoulDate.formatToParts(now).map((p) => [p.type, p.value]));
  const [year, month, day] = [Number(parts.year), Number(parts.month), Number(parts.day)];
  const weekday = WEEKDAYS.indexOf(parts.weekday); // 0 = 일요일
  const at = (days: number) => seoulMidnight(year, month, day, days);

  if (kind === "today") return { start: at(0), end: at(1) };
  // 다음 월요일 0시까지 남은 날 (일요일이면 내일)
  const toNextMonday = weekday === 0 ? 1 : 8 - weekday;
  if (kind === "week") return { start: at(0), end: at(toNextMonday) };
  if (weekday === 0) return { start: at(0), end: at(1) };
  return { start: at(6 - weekday), end: at(toNextMonday) };
}

// --------------------------------------------------------------------------- 거르기

/** 거르는 데 필요한 소셜링 칸 (socialing_summaries) */
export type FilterableSocialing = {
  category_slug: string;
  category_is_party: boolean;
  venue_type: "branch" | "external";
  venue_id: number;
  region_sido: string;
  region_sigungu: string;
  starts_at: string;
};

export function filterSocialings<T extends FilterableSocialing>(
  socialings: T[],
  filter: ExploreFilter,
  catalog: FilterCatalog,
  now: Date,
): T[] {
  const range = filter.date ? dateFilterRange(filter.date, now) : null;
  const region = filter.place?.kind === "region" ? resolveRegion(filter.place.code, catalog) : null;

  return socialings.filter((s) => {
    if (filter.hideParty && s.category_is_party) return false;
    if (filter.categories.length > 0 && !filter.categories.includes(s.category_slug)) return false;
    if (range) {
      const startsAt = new Date(s.starts_at).getTime();
      if (startsAt < range.start.getTime() || startsAt >= range.end.getTime()) return false;
    }
    if (filter.place?.kind === "branch") {
      if (s.venue_type !== "branch") return false;
      if (filter.place.branchId !== "all" && s.venue_id !== filter.place.branchId) return false;
    }
    if (region) {
      // 지역: 그 지역의 스터디지점과 외부 장소 모두 (EUNI 2026-10-14)
      if (s.region_sido !== region.sido) return false;
      if (region.sigungu && s.region_sigungu !== region.sigungu) return false;
    }
    return true;
  });
}

/** 지역 코드 → 시·도(+ 시·군·구). 2자리면 시·도 전체 */
export function resolveRegion(code: string, catalog: FilterCatalog): { sido: string; sigungu: string | null } | null {
  if (code.length === 5) {
    const row = catalog.regions.find((r) => r.code === code);
    return row ? { sido: row.sido, sigungu: row.sigungu } : null;
  }
  const row = catalog.regions.find((r) => r.code.startsWith(code));
  return row ? { sido: row.sido, sigungu: null } : null;
}
