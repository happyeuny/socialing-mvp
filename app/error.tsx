"use client";

import { ErrorStateFull } from "@/components/error-state";

// 화면 전체를 불러오지 못했을 때 (spec 8.6 네트워크·서버 오류): "불러오지 못했어요" + 다시 시도 · 홈으로
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="px-page-x">
      <ErrorStateFull onRetry={retry} />
    </main>
  );
}
