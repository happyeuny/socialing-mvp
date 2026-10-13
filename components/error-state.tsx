"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, buttonVariants } from "@/components/button";

// DESIGN.md error-state/full (spec 8.6 네트워크·서버 오류): "불러오지 못했어요" + 다시 시도 · 홈으로.
// 다시 시도는 화면의 서버 데이터를 새로 읽는다(router.refresh). 오류 경계(error.tsx)에서는 그쪽 retry를 넘긴다.

export function ErrorStateFull({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function retry() {
    startTransition(() => (onRetry ? onRetry() : router.refresh()));
  }

  return (
    <div role="alert" className="flex flex-col items-center gap-sm px-lg py-3xl text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <CircleAlert className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-xxs">
        <p className="text-title-md text-text-primary">불러오지 못했어요</p>
        <p className="text-body-sm text-text-secondary">연결을 확인하고 다시 시도해 주세요</p>
      </div>
      <div className="mt-xs flex flex-col items-center">
        <Button variant="primary" size="md" loading={isPending} onClick={retry}>
          다시 시도
        </Button>
        <Link href="/" className={buttonVariants({ variant: "text-link", size: "inline" })}>
          홈으로
        </Link>
      </div>
    </div>
  );
}
