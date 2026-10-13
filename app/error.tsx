"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/button";

// 화면 전체를 불러오지 못했을 때 (spec 8.6 네트워크·서버 오류): "불러오지 못했어요" + 다시 시도 · 홈으로
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex flex-col items-center gap-md px-page-x py-3xl text-center">
      <p className="text-title-md text-text-primary">불러오지 못했어요</p>
      <div className="flex items-center gap-xs">
        <Button variant="secondary" size="md" onClick={() => retry()}>
          다시 시도
        </Button>
        <Link href="/" className={buttonVariants({ variant: "text-link", size: "inline" })}>
          홈으로
        </Link>
      </div>
    </main>
  );
}
