import { HeaderSub } from "@/components/header-sub";
import { SkeletonSocialingForm } from "@/components/skeleton";

// P08 불러오는 동안 (spec 8.6 로딩, screen-cases P08-06)
export default function Loading() {
  return (
    <>
      <HeaderSub title="소셜링 수정" />
      <SkeletonSocialingForm />
    </>
  );
}
