import { ErrorStateNotFound } from "@/components/error-state";
import { HeaderSub } from "@/components/header-sub";

// 없는 소셜링의 후기 쓰기 주소: "찾을 수 없는 소셜링이에요" + 탐색으로 · 홈으로
export default function NotFound() {
  return (
    <>
      <HeaderSub title="후기 쓰기" />
      <main className="px-page-x">
        <ErrorStateNotFound />
      </main>
    </>
  );
}
