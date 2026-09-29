/**
 * One-off staging walk for PR screenshots. Not part of `npm run test:e2e`
 * (that suite only matches e2e/specs). Staging host only.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const STAGING_ORIGIN =
  "https://regi-staging-90502049802.us-central1.run.app";

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || STAGING_ORIGIN).replace(
  /\/$/,
  "",
);
if (baseURL !== STAGING_ORIGIN) {
  console.error(`Refusing non-staging base URL: ${baseURL}`);
  process.exit(1);
}

const email =
  process.env.REGI_STAGING_DEMO_EMAIL?.trim() ||
  "demo.applicant+staging@regireg.com";
const password = process.env.REGI_STAGING_DEMO_PASSWORD?.trim();
if (!password) {
  console.error("REGI_STAGING_DEMO_PASSWORD is not set.");
  process.exit(1);
}

const outDir = process.env.WALK_OUT || "/tmp/staging-walk";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});

try {
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page
    .getByRole("heading", { name: "Garage", exact: true })
    .waitFor({ state: "visible", timeout: 45_000 });
  await page
    .getByLabel("Loading registrations")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});

  const vehicleList = page.getByTestId("vehicle-list");
  if (await vehicleList.isVisible().catch(() => false)) {
    await vehicleList.screenshot({
      path: path.join(outDir, "staging-garage-cards.png"),
      type: "png",
    });
  }
  await page.screenshot({
    path: path.join(outDir, "staging-garage.png"),
    type: "png",
    fullPage: true,
  });

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page
    .getByRole("heading", { name: "Settings", exact: true })
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.getByTestId("settings-profile").waitFor({ state: "visible" });
  const editProfile = page.locator("summary").filter({ hasText: "Edit profile" });
  await editProfile.click();
  const profileForm = page.getByTestId("applicant-profile-form");
  await profileForm.waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("details").filter({ hasText: "Edit profile" }).evaluate((el) => {
    el.open = true;
  });
  await profileForm.waitFor({ state: "visible", timeout: 20_000 });
  // Tall viewport so the profile header and the opened form are in one frame.
  // A full-page capture of this screen omitted the open <details> body.
  await page.setViewportSize({ width: 430, height: 1700 });
  await page.getByTestId("settings-profile").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(outDir, "staging-settings-profile.png"),
    type: "png",
    fullPage: false,
  });
  await profileForm.screenshot({
    path: path.join(outDir, "staging-settings-form.png"),
    type: "png",
  });

  await page.goto(`${baseURL}/garage/plates`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: /Plan your request/i })
    .waitFor({ state: "visible", timeout: 25_000 });
  await page.screenshot({
    path: path.join(outDir, "staging-plates.png"),
    type: "png",
    fullPage: false,
  });

  console.log(`Wrote PNG screenshots to ${outDir}`);
} finally {
  await browser.close();
}
