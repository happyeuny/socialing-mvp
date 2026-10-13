"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";

// DESIGN.md toast/success · toast/info. 성공 뒤 화면 아래 잠깐 뜨는 짧은 안내 (spec 8.6 "성공", screen-cases C12).
// 어디서든 showToast()로 띄운다. 루트 레이아웃의 <Toaster />가 한 번에 하나만 보이고, 화면을 옮겨도 남는다
// (가입 뒤 홈으로 가면서 "환영해요, ○○님").
// 자리는 아래 고정 영역(data-toast-anchor: 상세 apply-bar, 아래 탭) 바로 위, 그런 영역이 없으면 화면 아래.

export type Toast = {
  message: string;
  /** toast/success의 링크. 예: "내 소셜링에서 보기 ›" */
  link?: { href: string; label: string };
};

const DURATION_MS = 4000;
const GAP_PX = 8;

type Entry = Toast & { id: number };

let current: Entry | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showToast(toast: Toast) {
  current = { ...toast, id: nextId++ };
  emit();
}

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function Toaster() {
  const toast = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const regionRef = useRef<HTMLDivElement>(null);

  // 잠깐 보이고 사라진다
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // 아래 고정 영역 바로 위에 둔다. 화면이 바뀌거나(가입 → 홈) 영역이 바뀌면(신청 → 7줄) 다시 잰다
  useLayoutEffect(() => {
    const region = regionRef.current;
    if (!toast || !region) return;

    function place() {
      if (!region) return;
      const tops = Array.from(document.querySelectorAll("[data-toast-anchor]"))
        .map((anchor) => anchor.getBoundingClientRect())
        .filter((rect) => rect.height > 0)
        .map((rect) => rect.top);
      region.style.bottom = tops.length > 0 ? `${window.innerHeight - Math.min(...tops) + GAP_PX}px` : "";
    }

    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [toast]);

  return (
    // 읽기 프로그램이 새 안내를 읽도록 영역은 늘 있고, 안의 내용만 바뀐다.
    // role="status"는 로딩 틀(skeleton)이 쓰므로 여기서는 aria-live만 둔다
    <div
      ref={regionRef}
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(16px+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-(--spacing-screen) px-page-x"
    >
      {toast ? (
        <div
          key={toast.id}
          data-testid="toast"
          className="pointer-events-auto flex items-center justify-between gap-sm rounded-lg bg-toast-bg px-md py-sm text-body-md text-toast-text motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
        >
          <p>{toast.message}</p>
          {toast.link ? (
            <Link
              href={toast.link.href}
              onClick={() => dismiss(toast.id)}
              // 터치 영역 44px, 안내 높이는 그대로 (위아래 여백 안으로 넓힌다)
              className="-my-sm inline-flex min-h-touch-min shrink-0 items-center font-medium text-primary"
            >
              {toast.link.label}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
