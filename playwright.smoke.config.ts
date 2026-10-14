import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// 운영 주소 읽기 점검 (npm run test:smoke, docs/demo-checklist.md). 데이터를 바꾸지 않는다.
// 기본 대상은 운영 주소이고, PLAYWRIGHT_BASE_URL로 바꿀 수 있다. 전체 E2E(playwright.config.ts)와는 따로 돈다.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "https://socialing-mvp.vercel.app",
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  },
  projects: [
    {
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
});
