import { HeaderSub } from "@/components/header-sub";
import { SkeletonReviewWrite } from "@/components/skeleton";

// P09 불러오는 동안 (spec 8.6 로딩, screen-cases P09-11)
export default function Loading() {
  return (
    <>
      <HeaderSub title="후기 쓰기" />
      <SkeletonReviewWrite />
    </>
  );
}
