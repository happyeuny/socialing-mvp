import { HeaderSub } from "@/components/header-sub";
import { SkeletonDetail } from "@/components/skeleton";

// P03 불러오는 동안 (spec 8.6 로딩): 4:3 사진 칸 + 제목 막대 + 정보 줄
export default function Loading() {
  return (
    <>
      <HeaderSub title="소셜링 상세" />
      <SkeletonDetail />
    </>
  );
}
