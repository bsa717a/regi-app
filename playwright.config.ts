import { defineConfig, devices } from "@playwright/test";
import {
  isLocalPlaywrightHost,
  resolvePlaywrightBaseURL,
} from "./src/lib/e2e/stagingTarget";

/**
 * Real browser E2E against durable staging (default).
 *
 *   PLAYWRIGHT_BASE_URL   default: staging Cloud Run
 *   REGI_STAGING_DEMO_EMAIL / REGI_STAGING_DEMO_PASSWORD
 *     (or PLAYWRIGHT_EMAIL / PLAYWRIGHT_PASSWORD)
 *
 * Production hosts are refused. Do not point this suite at app.regireg.com.
 */
const baseURL = resolvePlaywrightBaseURL();
const localHost = isLocalPlaywrightHost(new URL(baseURL).hostname);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /specs\/.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: localHost
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
