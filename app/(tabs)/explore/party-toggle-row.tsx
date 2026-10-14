"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Toggle } from "@/components/toggle";
import { exploreSearch, withHideParty, type ExploreFilter, type FilterCatalog } from "@/lib/explore-filter";

// P01 "파티·사교 숨기기" (spec M2, 8.9): 기본 꺼짐, 탐색 목록에만. 켜고 끄면 주소를 바꿔 끼운다
// (뒤로 가기에 단계가 쌓이지 않고, 상세에 갔다 뒤로 오면 그대로). 켤 때 카테고리의 파티·사교는 빠진다.

export function PartyToggleRow({ filter, catalog }: { filter: ExploreFilter; catalog: FilterCatalog }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(filter.hideParty);

  function change(next: boolean) {
    startTransition(() => {
      setChecked(next);
      router.replace(`/explore${exploreSearch(withHideParty(filter, next, catalog))}`, { scroll: false });
    });
  }

  return (
    <div className="border-b border-border-divider" aria-busy={isPending || undefined}>
      <Toggle label="파티·사교 숨기기" checked={checked} onCheckedChange={change} className="py-xs" />
    </div>
  );
}
