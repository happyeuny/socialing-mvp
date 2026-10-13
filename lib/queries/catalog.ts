import { createClient } from "@/lib/supabase/server";

// 홈 바로가기(P00)와 나중의 탐색 필터(MS6)가 쓰는 카테고리·스터디지점 목록.

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
