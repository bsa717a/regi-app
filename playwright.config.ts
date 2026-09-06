import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for REGI critical paths.
 *
 * Run with:
 *   npx playwright test              # headless
 *   npx playwright test --ui         # interactive UI mode
 *   npx playwright test --headed     # visible browser
 *
 * Environment variables:
 *   PLAYWRIGHT_BASE_URL - App URL (default: http://127.0.0.1:8080)
 *   E2E_TEST_EMAIL      - Test user email for authenticated flows
 *   E2E_TEST_PASSWORD   - Test user password
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:8080",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
