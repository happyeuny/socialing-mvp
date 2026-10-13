import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { withNext } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { PhotoUploadCheck } from "./photo-upload-check";

// SP3 실기기 사진 업로드 확인용 임시 화면. Vercel 미리보기와 로컬에서만 열리고 운영(main)에서는 404.
// SP3 E2E(tests/e2e/sp3-photo.spec.ts)도 이 화면으로 photo-picker를 확인한다. MS5 후기 쓰기가 같은 부품을 쓰면
// 테스트를 그 화면으로 옮기고 이 화면을 지운다.

export const metadata: Metadata = { title: "사진 올리기 확인 · 문화소셜링", robots: { index: false } };

export default async function PhotoUploadCheckPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(withNext("/login", "/dev/photo-upload"));

  return (
    <main className="flex flex-col gap-xl px-page-x py-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="text-title-xl text-text-primary">사진 올리기 확인</h1>
        <p className="text-body-sm text-text-secondary">
          개발 확인용 화면이에요. 사진을 고르면 1MB 이하로 줄여 올리고, 결과를 아래에 보여 줘요.
        </p>
      </div>
      <PhotoUploadCheck userId={userId} />
    </main>
  );
}
