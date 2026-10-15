"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { withNext } from "@/lib/routes";

// 머리글 "로그인": 로그인하면 지금 보던 주소로 돌아오게 next를 붙인다 (spec 8.1, 8.7). 모양은 header-main이 넘긴다
export function HeaderLoginLink({ className }: { className: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;

  return (
    <Link href={withNext("/login", here)} className={className}>
      로그인
    </Link>
  );
}
