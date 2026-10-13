import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// 로컬·클라우드에서 .env.local(DEMO_PASSWORD 등)이 있으면 읽는다. 이미 있는 환경 변수는 덮어쓰지 않는다.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// PLAYWRIGHT_BASE_URL을 주면 그 주소(예: Vercel 미리보기)를 대상으로 돌리고,
// 없으면 로컬 개발 서버를 띄운다.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    {
      // 모바일 390px, Chromium (AGENTS.md 테스트)
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
