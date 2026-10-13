import { ErrorStateNotFound } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";

// 없는 소셜링 주소 (spec 8.6 P03 빈 상태): "찾을 수 없는 소셜링이에요" + 탐색으로 · 홈으로
export default function NotFound() {
  return (
    <>
      <HeaderSub title="소셜링 상세" />
      <main className="px-page-x">
        <ErrorStateNotFound />
      </main>
    </>
  );
}
