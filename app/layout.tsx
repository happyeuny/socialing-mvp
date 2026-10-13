import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-kr";
import { NavigationTracker } from "@/components/navigation-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "문화소셜링",
  description: "신청 전에 믿고 고르는 소셜링",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
  colorScheme: "light",
  // 아이폰 아래 안전 영역(env(safe-area-inset-bottom))을 아래 탭·고정 영역에서 쓰려고
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 휴대폰 세로 390px 기준. 넓은 화면에서도 390px 폭을 가운데에 둔다 (DESIGN.md Overview) */}
        <div className="mx-auto min-h-dvh w-full max-w-(--spacing-screen) bg-surface-bg">{children}</div>
        <NavigationTracker />
      </body>
    </html>
  );
}
