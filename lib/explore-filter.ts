// 탐색(P01) 필터와 "파티·사교 숨기기" (spec M2, M3, 6장 날짜 필터, 8.7). 참가비는 MS12(SH1a).
// 값은 주소(`/explore?…`)에 담고, 서버 목록과 필터 시트의 "소셜링 N개 보기"가 같은 함수로 거른다(목록과 숫자가 늘 같게).
// 화면 표시와 같이 날짜는 한국 시간으로 계산한다. 서버·브라우저 어디서 불러도 같은 결과다.
//
// 주소: /explore?category=learning,hobby&date=week&branch=1&region=11440&fee=upto10k&hide_party=1
//   category   카테고리 slug 여러 개(쉼표)
//   date       today · week · weekend
//   branch     스터디지점 venue id 또는 all(전체 지점)
//   region     지역 법정동코드: 2자리 = 시·도 전체, 5자리 = 시·군·구. 그 지역의 스터디지점과 외부 장소를 모두 거른다
//   fee        총 참가비 구간 하나: free(0원) · upto10k(1~10,000원) · 10k-20k(10,001~20,000원) · over20k(20,001원 이상)
//   hide_party 1 = 파티·사교 숨기기. 카테고리에 파티·사교를 고르면 꺼진다
// 알 수 없는 값은 무시한다. branch와 region이 함께 오면 branch를 쓴다.

import { shortSido } from "@/lib/format";

export const DATE_FILTERS = ["today", "week", "weekend"] as const;
export type DateFilter = (typeof DATE_FILTERS)[number];

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "오늘",
  week: "이번 주",
  weekend: "이번 주말",
};

/** 참가비 구간 (spec M3). 겹치지 않아서 "1만 원 이하"에 무료는 들어가지 않는다 */
export const FEE_FILTERS = ["free", "upto10k", "10k-20k", "over20k"] as const;
export type FeeFilter = (typeof FEE_FILTERS)[number];

export const FEE_FILTER_LABELS: Record<FeeFilter, string> = {
  free: "무료",
  upto10k: "1만 원 이하",
  "10k-20k": "1만~2만 원",
  over20k: "2만 원 넘음",
};

/** 구간의 총 참가비 범위 [min, max] (원, 둘 다 포함) */
const FEE_RANGES: Record<FeeFilter, [number, number]> = {
  free: [0, 0],
  upto10k: [1, 10_000],
  "10k-20k": [10_001, 20_000],
  over20k: [20_001, Number.POSITIVE_INFINITY],
};

export function feeInRange(fee: number, filter: FeeFilter): boolean {
  const [min, max] = FEE_RANGES[filter];
  return fee >= min && fee <= max;
}

export type PlaceFilter = { kind: "branch"; branchId: number | "all" } | { kind: "region"; code: string };

export type ExploreFilter = {
  categories: string[];
  date: DateFilter | null;
  place: PlaceFilter | null;
  fee: FeeFilter | null;
  hideParty: boolean;
};

export const EMPTY_FILTER: ExploreFilter = { categories: [], date: null, place: null, fee: null, hideParty: false };

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

  const feeValue = first(params.fee);
  const fee = FEE_FILTERS.find((f) => f === feeValue) ?? null;

  return normalizeFilter({ categories, date, place, fee, hideParty: first(params.hide_party) === "1" }, catalog);
}

/** 카테고리에 파티·사교가 있으면 "파티·사교 숨기기"를 끈다 (spec 8.9 P01). 필터 시트를 적용할 때도 쓴다 */
export function normalizeFilter(filter: ExploreFilter, catalog: FilterCatalog): ExploreFilter {
  const hasParty = filter.categories.some((slug) => catalog.categories.find((c) => c.slug === slug)?.isParty);
  return hasParty && filter.hideParty ? { ...filter, hideParty: false } : filter;
}

/** 필터를 주소의 `?…`로 (값이 없으면 빈 문자열) */
export function exploreSearch(filter: ExploreFilter): string {
  const parts: string[] = [];
  if (filter.categories.length > 0) parts.push(`category=${filter.categories.join(",")}`);
  if (filter.date) parts.push(`date=${filter.date}`);
  if (filter.place?.kind === "branch") parts.push(`branch=${filter.place.branchId}`);
  if (filter.place?.kind === "region") parts.push(`region=${filter.place.code}`);
  if (filter.fee) parts.push(`fee=${filter.fee}`);
  if (filter.hideParty) parts.push("hide_party=1");
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/** 필터나 토글이 하나라도 걸려 있는지 (결과 0일 때 "조건에 맞는 소셜링이 없어요" + 필터 초기화) */
export function hasAnyFilter(filter: ExploreFilter): boolean {
  return (
    filter.categories.length > 0 || filter.date !== null || filter.place !== null || filter.fee !== null || filter.hideParty
  );
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
  fee: number;
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
    if (filter.fee && !feeInRange(s.fee, filter.fee)) return false;
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

// --------------------------------------------------------------------------- 칩·시트 표시

/** 시·도 목록(법정동코드 앞 2자리, 코드 순) */
export function sidoOptions(catalog: FilterCatalog): { code: string; sido: string }[] {
  const seen = new Map<string, string>();
  for (const r of catalog.regions) if (!seen.has(r.code.slice(0, 2))) seen.set(r.code.slice(0, 2), r.sido);
  return [...seen].map(([code, sido]) => ({ code, sido }));
}

/** 시·도 하나의 시·군·구 목록(코드 순) */
export function sigunguOptions(catalog: FilterCatalog, sidoCode: string): { code: string; sigungu: string }[] {
  return catalog.regions.filter((r) => r.code.startsWith(sidoCode)).map((r) => ({ code: r.code, sigungu: r.sigungu }));
}

/** 장소 값의 짧은 이름: "강남점" · "전체 지점" · "마포구" · "서울 전체" */
export function placeLabel(place: PlaceFilter, catalog: FilterCatalog): string | null {
  if (place.kind === "branch") {
    if (place.branchId === "all") return "전체 지점";
    return catalog.branches.find((b) => b.id === place.branchId)?.name ?? null;
  }
  const region = resolveRegion(place.code, catalog);
  if (!region) return null;
  return region.sigungu ?? `${shortSido(region.sido)} 전체`;
}

/** 필터 칩에 보이는 값 (spec 8.2 P01: 적용하면 값 표시). 값이 없으면 null → 항목 이름 */
export function filterChipValues(
  filter: ExploreFilter,
  catalog: FilterCatalog,
): { date: string | null; place: string | null; category: string | null; fee: string | null } {
  const names = filter.categories.map((slug) => catalog.categories.find((c) => c.slug === slug)?.name ?? slug);
  return {
    date: filter.date ? DATE_FILTER_LABELS[filter.date] : null,
    place: filter.place ? placeLabel(filter.place, catalog) : null,
    category: names.length === 0 ? null : names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}`,
    fee: filter.fee ? FEE_FILTER_LABELS[filter.fee] : null,
  };
}
