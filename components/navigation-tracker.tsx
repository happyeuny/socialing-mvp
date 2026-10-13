"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { markInAppNavigation } from "@/lib/in-app-history";

// 주소가 바뀌면 "앱 안에서 이동했다"고 적어 둔다. 화면에는 아무것도 그리지 않는다.
export function NavigationTracker() {
  const pathname = usePathname();
  const firstPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPathname.current) markInAppNavigation();
  }, [pathname]);

  return null;
}
