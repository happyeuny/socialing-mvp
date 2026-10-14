import type { FilterCatalog } from "@/lib/explore-filter";
import { createClient } from "@/lib/supabase/server";

// 홈 바로가기(P00), 탐색 필터(P01·O01), 소셜링 등록·수정 양식(P07·P08)이 쓰는 카테고리·스터디지점·지역 목록.

export type CategoryItem = { slug: string; name: string };
export type BranchItem = { id: number; name: string; sido: string; sigungu: string };

/** 카테고리 5개, spec 6장 순서 */
export async function listCategories(): Promise<CategoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("slug, name").order("sort_order");
  if (error) throw new Error(`카테고리를 불러오지 못했습니다: ${error.message}`);
  return data;
}

/** 스터디지점 3곳 (venues.type = branch) */
export async function listBranches(): Promise<BranchItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, regions(sido, sigungu)")
    .eq("type", "branch")
    .order("id");
  if (error) throw new Error(`스터디지점을 불러오지 못했습니다: ${error.message}`);
  return data.map((venue) => ({
    id: venue.id,
    name: venue.name,
    sido: venue.regions.sido,
    sigungu: venue.regions.sigungu,
  }));
}

/** 탐색 필터(P01·O01): 카테고리(파티·사교 여부), 스터디지점, 전국 시·군·구(법정동코드 순) */
export async function getFilterCatalog(): Promise<FilterCatalog> {
  const supabase = await createClient();
  const [categories, branches, regions] = await Promise.all([
    supabase.from("categories").select("slug, name, is_party").order("sort_order"),
    listBranches(),
    supabase.from("regions").select("code, sido, sigungu").order("code"),
  ]);
  if (categories.error) throw new Error(`카테고리를 불러오지 못했습니다: ${categories.error.message}`);
  if (regions.error) throw new Error(`지역을 불러오지 못했습니다: ${regions.error.message}`);
  return {
    categories: categories.data.map((c) => ({ slug: c.slug, name: c.name, isParty: c.is_party })),
    branches,
    regions: regions.data,
  };
}

export type SocialingFormCatalog = {
  categories: { id: number; name: string }[];
  branches: BranchItem[];
  regions: { code: string; sido: string; sigungu: string }[];
};

/** 소셜링 등록·수정(P07·P08) 양식: 카테고리(id), 스터디지점, 전국 시·군·구(법정동코드 순) */
export async function getSocialingFormCatalog(): Promise<SocialingFormCatalog> {
  const supabase = await createClient();
  const [categories, branches, regions] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    listBranches(),
    supabase.from("regions").select("code, sido, sigungu").order("code"),
  ]);
  if (categories.error) throw new Error(`카테고리를 불러오지 못했습니다: ${categories.error.message}`);
  if (regions.error) throw new Error(`지역을 불러오지 못했습니다: ${regions.error.message}`);
  return { categories: categories.data, branches, regions: regions.data };
}
