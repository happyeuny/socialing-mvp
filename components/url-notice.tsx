"use client";

import { useEffect } from "react";
import { showToast } from "@/components/toast";

// 다른 화면에서 보내면서 남긴 짧은 안내(lib/notices.ts)를 toast/info로 한 번 띄우고 주소의 `?notice=`를 지운다
// (새로 고침해도 다시 뜨지 않게). 예: 호스트가 아닌 사람이 관리(P11) 주소 → 상세 + "호스트만 볼 수 있어요".

export function UrlNotice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) return;
    showToast({ message });
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [message]);

  return null;
}
