import { HeaderSub } from "@/components/header-sub";
import { SkeletonSocialingForm } from "@/components/skeleton";

// P07 불러오는 동안 (spec 8.6 로딩)
export default function Loading() {
  return (
    <>
      <HeaderSub title="소셜링 등록" />
      <SkeletonSocialingForm />
    </>
  );
}
