import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-kr";
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
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {/* 휴대폰 세로 390px 기준. 넓은 화면에서도 390px 폭을 가운데에 둔다 (DESIGN.md Overview) */}
        <div className="mx-auto min-h-dvh w-full max-w-(--spacing-screen) bg-surface-bg">{children}</div>
      </body>
    </html>
  );
}
