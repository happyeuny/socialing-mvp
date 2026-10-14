import { HeaderSub } from "@/components/header-sub";
import { SkeletonManage } from "@/components/skeleton";

// P11 불러오는 동안 (spec 8.6 로딩, screen-cases P11-21)
export default function Loading() {
  return (
    <>
      <HeaderSub title="소셜링 관리" />
      <SkeletonManage />
    </>
  );
}
