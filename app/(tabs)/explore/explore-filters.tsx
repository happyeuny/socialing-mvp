"use client";

import { useRouter } from "next/navigation";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@/components/button";
import { ChoiceChip } from "@/components/choice-chip";
import { FilterChip, FilterIconChip } from "@/components/filter-chip";
import { FilterSheet } from "@/components/filter-sheet";
import { RadioRow, RadioRowBack, RadioRowNext } from "@/components/radio-row";
import { SegmentedChoice } from "@/components/segmented";
import { Toggle } from "@/components/toggle";
import {
  DATE_FILTER_LABELS,
  DATE_FILTERS,
  EMPTY_FILTER,
  exploreSearch,
  FEE_FILTER_LABELS,
  FEE_FILTERS,
  filterChipValues,
  filterSocialings,
  normalizeFilter,
  placeLabel,
  sidoOptions,
  sigunguOptions,
  withHideParty,
  type DateFilter,
  type ExploreFilter,
  type FeeFilter,
  type FilterableSocialing,
  type FilterCatalog,
  type PlaceFilter,
} from "@/lib/explore-filter";
import { shortSido } from "@/lib/format";

// P01 필터 칩 줄 + "파티·사교 숨기기" + 필터 시트 O01 (spec M2, M3, 8.2, 8.9 · 시안 P01·O01).
// 시트 순서는 카테고리 → 날짜 → 장소 → 참가비 → 술 여부, 칩 줄은 날짜 · 장소 · 카테고리 · 참가비 · 술 여부.
// 값은 주소에만 있다. 칩·토글·시트 적용은 주소를 바꿔 끼우고(뒤로 가기에 쌓이지 않음) 서버가 다시 거른 목록을 그린다.
// 시트 안에서 고르는 값은 적용 전까지 시트에만 있고, "소셜링 N개 보기"는 목록과 같은 함수로 센다.

type Section = "all" | "date" | "place" | "category" | "fee" | "alcohol";
type PlaceTab = "branch" | "region";

const DATE_OPTIONS = [
  { value: "all", label: "전체" },
  ...DATE_FILTERS.map((value) => ({ value, label: DATE_FILTER_LABELS[value] })),
] as const;
const FEE_OPTIONS = [
  { value: "all", label: "전체" },
  ...FEE_FILTERS.map((value) => ({ value, label: FEE_FILTER_LABELS[value] })),
] as const;
const ALCOHOL_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "none", label: "술 없음" },
] as const;
const PLACE_TABS = [
  { value: "branch", label: "스터디지점" },
  { value: "region", label: "지역 (시·도 → 구)" },
] as const;

export function ExploreFilters({
  filter,
  catalog,
  socialings,
}: {
  filter: ExploreFilter;
  catalog: FilterCatalog;
  /** 거르기 전 현재 소셜링 전부 (시트의 개수 계산용) */
  socialings: FilterableSocialing[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(filter);

  const [section, setSection] = useState<Section | null>(null);
  const [draft, setDraft] = useState<ExploreFilter>(filter);
  const [placeTab, setPlaceTab] = useState<PlaceTab>("branch");
  const [sidoView, setSidoView] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ids = { date: useId(), place: useId(), category: useId(), fee: useId(), alcohol: useId() };

  const chips = filterChipValues(current, catalog);
  const applied = normalizeFilter(draft, catalog);
  const count = filterSocialings(socialings, applied, catalog, new Date()).length;

  function navigate(next: ExploreFilter) {
    startTransition(() => {
      setCurrent(next);
      router.replace(`/explore${exploreSearch(next)}`, { scroll: false });
    });
  }

  function openSheet(target: Section) {
    setDraft(current);
    const place = current.place;
    setPlaceTab(place?.kind ?? "branch");
    setSidoView(place?.kind === "region" ? place.code.slice(0, 2) : null);
    setSection(target);
  }

  /** 시트 안에서 그 항목을 맨 위로 */
  function scrollBodyTo(target: Exclude<Section, "all">) {
    const element = bodyRef.current?.querySelector<HTMLElement>(`[data-section="${target}"]`);
    if (bodyRef.current && element) bodyRef.current.scrollTop = element.offsetTop - 20;
    return element;
  }

  // 칩에서 열면 그 항목이 시트 맨 위에 오게 (spec 8.9 P01)
  function scrollToSection(event: Event) {
    if (section === "all" || !section) return;
    const element = scrollBodyTo(section);
    if (!element) return;
    event.preventDefault();
    element.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
  }

  // 시·도 ↔ 구 목록을 바꾸면 장소 묶음 맨 위로 (구 목록 맨 위 "‹ 시·도"가 보이게)
  function showSido(code: string | null) {
    setSidoView(code);
    requestAnimationFrame(() => scrollBodyTo("place"));
  }

  function apply() {
    setSection(null);
    navigate(applied);
  }

  const setPlace = (place: PlaceFilter | null) => setDraft((d) => ({ ...d, place }));
  const placeValue = (place: PlaceFilter | null) =>
    place === null ? "none" : place.kind === "branch" ? `branch:${place.branchId}` : `region:${place.code}`;
  const draftPlace = placeValue(draft.place);
  const draftRegion = draft.place?.kind === "region" ? draft.place.code : null;

  return (
    <>
      <div
        className="-mx-page-x flex gap-xs overflow-x-auto px-page-x py-xxs [scrollbar-width:none]"
        role="group"
        aria-label="필터"
        aria-busy={isPending || undefined}
      >
        <FilterIconChip onClick={() => openSheet("all")} />
        <FilterChip label="날짜" value={chips.date} onClick={() => openSheet("date")} />
        <FilterChip label="장소" value={chips.place} onClick={() => openSheet("place")} />
        <FilterChip label="카테고리" value={chips.category} onClick={() => openSheet("category")} />
        <FilterChip label="참가비" value={chips.fee} onClick={() => openSheet("fee")} />
        <FilterChip label="술 여부" value={chips.alcohol} onClick={() => openSheet("alcohol")} />
      </div>

      <div className="mt-xs border-b border-border-divider">
        <Toggle
          label="파티·사교 숨기기"
          checked={current.hideParty}
          onCheckedChange={(on) => navigate(withHideParty(current, on, catalog))}
          className="py-xs"
        />
      </div>

      <FilterSheet
        open={section !== null}
        onOpenChange={(open) => (open ? undefined : setSection(null))}
        title="필터"
        bodyRef={bodyRef}
        onOpenAutoFocus={scrollToSection}
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setDraft({ ...EMPTY_FILTER, hideParty: draft.hideParty })}
            >
              초기화
            </Button>
            <Button size="md" className="flex-[2]" onClick={apply}>
              소셜링 {count}개 보기
            </Button>
          </>
        }
      >
        <section data-section="category" aria-labelledby={ids.category} className="flex flex-col gap-sm">
          <h3 id={ids.category} className="flex items-baseline gap-xs text-title-md text-text-primary">
            카테고리 <span className="text-body-sm font-normal text-text-muted">여러 개 선택</span>
          </h3>
          <div className="flex flex-wrap gap-xs">
            {catalog.categories.map((c) => (
              <ChoiceChip
                key={c.slug}
                label={c.name}
                checked={draft.categories.includes(c.slug)}
                onCheckedChange={(on) =>
                  setDraft((d) => ({
                    ...d,
                    // 카테고리 순서(spec 6장)를 지킨다
                    categories: catalog.categories
                      .map((x) => x.slug)
                      .filter((slug) => (slug === c.slug ? on : d.categories.includes(slug))),
                  }))
                }
              />
            ))}
          </div>
        </section>

        <section data-section="date" aria-labelledby={ids.date} className="flex flex-col gap-sm">
          <h3 id={ids.date} className="text-title-md text-text-primary">
            날짜
          </h3>
          <SegmentedChoice
            name="filter-date"
            labelledBy={ids.date}
            options={DATE_OPTIONS}
            value={draft.date ?? "all"}
            onChange={(value) => setDraft((d) => ({ ...d, date: value === "all" ? null : (value as DateFilter) }))}
          />
        </section>

        <section data-section="place" aria-labelledby={ids.place} className="flex flex-col gap-sm">
          <h3 id={ids.place} className="text-title-md text-text-primary">
            장소
          </h3>
          <SegmentedChoice
            name="filter-place-tab"
            labelledBy={ids.place}
            options={PLACE_TABS}
            value={placeTab}
            onChange={setPlaceTab}
          />
          <div className="flex flex-col">
            {placeTab === "branch" ? (
              <>
                <RadioRow
                  name="filter-place"
                  value="branch:all"
                  label="전체 지점"
                  checked={draftPlace === "branch:all"}
                  onSelect={() => setPlace({ kind: "branch", branchId: "all" })}
                />
                {catalog.branches.map((b) => (
                  <RadioRow
                    key={b.id}
                    name="filter-place"
                    value={`branch:${b.id}`}
                    label={b.name}
                    sub={`${shortSido(b.sido)} ${b.sigungu}`}
                    checked={draftPlace === `branch:${b.id}`}
                    onSelect={() => setPlace({ kind: "branch", branchId: b.id })}
                  />
                ))}
              </>
            ) : sidoView === null ? (
              <>
                {/* 전국 = 장소를 거르지 않음. 장소만 지울 때 고른다 */}
                <RadioRow
                  name="filter-place"
                  value="none"
                  label="전국"
                  checked={draftPlace === "none"}
                  onSelect={() => setPlace(null)}
                />
                {sidoOptions(catalog).map((s) => (
                  <RadioRowNext
                    key={s.code}
                    label={s.sido}
                    sub={draftRegion?.startsWith(s.code) && draft.place ? placeLabel(draft.place, catalog) : null}
                    onClick={() => showSido(s.code)}
                  />
                ))}
              </>
            ) : (
              <>
                <RadioRowBack
                  label={sidoOptions(catalog).find((s) => s.code === sidoView)?.sido ?? "시·도"}
                  onClick={() => showSido(null)}
                />
                <RadioRow
                  name="filter-place"
                  value={`region:${sidoView}`}
                  label={`${sidoOptions(catalog).find((s) => s.code === sidoView)?.sido ?? ""} 전체`}
                  checked={draftRegion === sidoView}
                  onSelect={() => setPlace({ kind: "region", code: sidoView })}
                />
                {sigunguOptions(catalog, sidoView).map((r) => (
                  <RadioRow
                    key={r.code}
                    name="filter-place"
                    value={`region:${r.code}`}
                    label={r.sigungu}
                    checked={draftRegion === r.code}
                    onSelect={() => setPlace({ kind: "region", code: r.code })}
                  />
                ))}
              </>
            )}
          </div>
        </section>

        {/* 다섯 칸은 회색 틀 칸에 안 들어가서 카테고리와 같은 칩을 줄바꿈으로, 하나만 고른다 */}
        <section data-section="fee" aria-labelledby={ids.fee} className="flex flex-col gap-sm">
          <h3 id={ids.fee} className="text-title-md text-text-primary">
            참가비
          </h3>
          <div role="radiogroup" aria-labelledby={ids.fee} className="flex flex-wrap gap-xs">
            {FEE_OPTIONS.map((o) => (
              <ChoiceChip
                key={o.value}
                name="filter-fee"
                value={o.value}
                label={o.label}
                checked={(draft.fee ?? "all") === o.value}
                onCheckedChange={() =>
                  setDraft((d) => ({ ...d, fee: o.value === "all" ? null : (o.value as FeeFilter) }))
                }
              />
            ))}
          </div>
        </section>

        {/* "파티·사교 숨기기"와 따로 움직인다. 파티·사교를 골라도 꺼지지 않는다 */}
        <section data-section="alcohol" aria-labelledby={ids.alcohol} className="flex flex-col gap-sm">
          <h3 id={ids.alcohol} className="text-title-md text-text-primary">
            술 여부
          </h3>
          <SegmentedChoice
            name="filter-alcohol"
            labelledBy={ids.alcohol}
            options={ALCOHOL_OPTIONS}
            value={draft.noAlcohol ? "none" : "all"}
            onChange={(value) => setDraft((d) => ({ ...d, noAlcohol: value === "none" }))}
          />
        </section>
      </FilterSheet>
    </>
  );
}
