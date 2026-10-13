"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/button";
import { withNext } from "@/lib/routes";

// 머리글 "로그인": 로그인하면 지금 보던 주소로 돌아오게 next를 붙인다 (spec 8.1, 8.7)
export function HeaderLoginLink() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;

  return (
    <Link href={withNext("/login", here)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
      로그인
    </Link>
  );
}
