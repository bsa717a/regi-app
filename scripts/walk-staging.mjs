/**
 * Staging walk for garage-header screenshots.
 * Not part of `npm run test:e2e` (that suite only matches e2e/specs).
 * Staging host only. Never production.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const STAGING_ORIGIN = "https://regi-staging-90502049802.us-central1.run.app";

const PRODUCTION_HOSTS = new Set([
  "app.regireg.com",
  "www.regireg.com",
  "regireg.com",
  "regi-90502049802.us-central1.run.app",
  "regi-app-v1.web.app",
  "regi-app-v1.firebaseapp.com",
]);

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || STAGING_ORIGIN).replace(
  /\/$/,
  "",
);
let parsed;
try {
  parsed = new URL(baseURL);
} catch {
  console.error(`Refusing unparseable base URL: ${baseURL}`);
  process.exit(1);
}
if (
  parsed.origin !== STAGING_ORIGIN ||
  PRODUCTION_HOSTS.has(parsed.hostname)
) {
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

let token = "";
page.on("request", (request) => {
  const value = request.headers().authorization;
  if (value?.startsWith("Bearer ") && request.url().startsWith(`${STAGING_ORIGIN}/api/`)) {
    token = value.slice("Bearer ".length);
  }
});

const cleanupErrors = [];
let createdId = null;
let originalName;
let nameCleared = false;
let failure = null;

try {
  await page.goto(`${STAGING_ORIGIN}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await waitForGarage(page);
  await captureToken();

  const existing = await api(token, "/api/registrations");
  const rows = existing.registrations ?? [];
  if (rows.length > 0) {
    throw new Error(
      `Demo garage already has ${rows.length} vehicle(s). Refusing to delete them for an empty shot.`,
    );
  }

  await page.getByTestId("garage-empty-state").waitFor({ state: "visible" });
  await shot(page, "garage-empty.png");

  createdId = await seedVehicle(token);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForGarage(page);
  await page.getByText("Walk car", { exact: true }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await shot(page, "garage-filled.png");

  await api(token, `/api/registrations/${createdId}`, { method: "DELETE" });
  const removedId = createdId;
  createdId = null;
  const after = await api(token, "/api/registrations");
  if ((after.registrations ?? []).some((row) => row.id === removedId)) {
    throw new Error("Seeded vehicle was still listed after delete.");
  }

  const me = await api(token, "/api/me");
  originalName = me.user?.name ?? null;
  await api(token, "/api/me", {
    method: "PATCH",
    body: JSON.stringify({ name: null }),
  });
  nameCleared = true;
  await page.goto(`${STAGING_ORIGIN}/garage`, { waitUntil: "domcontentloaded" });
  await waitForGarage(page);
  await page.getByRole("heading", { level: 1, name: "Your Garage", exact: true }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await page.getByTestId("garage-empty-state").waitFor({ state: "visible" });
  await shot(page, "garage-your-garage-fallback.png");
} catch (err) {
  failure = err;
} finally {
  if (createdId && token) {
    try {
      await api(token, `/api/registrations/${createdId}`, { method: "DELETE" });
    } catch (err) {
      cleanupErrors.push(`delete seeded vehicle: ${err.message}`);
    }
  }
  if (nameCleared && token) {
    try {
      await api(token, "/api/me", {
        method: "PATCH",
        body: JSON.stringify({ name: originalName }),
      });
    } catch (err) {
      cleanupErrors.push(`restore profile name: ${err.message}`);
    }
  }
  await browser.close();
}

if (failure) {
  console.error(failure instanceof Error ? failure.message : failure);
}
if (cleanupErrors.length) {
  console.error(cleanupErrors.join("\n"));
}
if (failure || cleanupErrors.length) {
  process.exit(1);
}
console.log(`Wrote PNG screenshots to ${outDir}`);

async function captureToken() {
  const deadline = Date.now() + 20_000;
  while (!token && Date.now() < deadline) {
    await page.waitForTimeout(200);
  }
  if (!token) {
    throw new Error("Did not capture a staging API token after login.");
  }
}

async function waitForGarage(page) {
  const logo = page.getByTestId("regi-logo");
  await logo.waitFor({ state: "visible", timeout: 45_000 });
  const src = await logo.getAttribute("src");
  if (!src?.includes("regi-wordmark")) {
    throw new Error(`Expected the light REGI wordmark, got ${src}`);
  }
  const box = await logo.boundingBox();
  if (!box || box.height < 24 || box.height > 40 || box.width < 70) {
    throw new Error(
      `Wordmark box was ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "missing"}`,
    );
  }
  await page
    .getByRole("heading", { level: 1, name: /Garage$/ })
    .waitFor({ state: "visible", timeout: 20_000 });
  await page
    .getByLabel("Loading registrations")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});
}

async function shot(page, filename) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(outDir, filename),
    type: "png",
    fullPage: false,
  });
  console.log(`wrote ${filename}`);
}

async function api(authToken, apiPath, options = {}) {
  const response = await fetch(`${STAGING_ORIGIN}${apiPath}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: options.body,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && body.error
        ? body.error
        : String(text).slice(0, 300);
    throw new Error(`${options.method || "GET"} ${apiPath} ${response.status}: ${message}`);
  }
  return body;
}

async function seedVehicle(authToken) {
  const listed = await api(authToken, "/api/states");
  const states = listed.states ?? [];
  const state = states.find((row) => row.code === "UT") ?? states[0];
  if (!state) {
    throw new Error("No active state on staging.");
  }
  const passenger = (state.registrationTypes ?? []).find(
    (row) => row.type === "passenger",
  );
  const type = passenger?.type ?? state.registrationTypes?.[0]?.type;
  if (!type) {
    throw new Error(`No registration type for ${state.code}.`);
  }
  const created = await api(authToken, "/api/registrations", {
    method: "POST",
    body: JSON.stringify({
      type,
      state: state.code,
      vin: "1HGCM82633A004352",
      plate: "WALK86",
      year: 2003,
      make: "Honda",
      model: "Accord",
      nickname: "Walk car",
      registrationExpiresOn: "2027-08-15",
    }),
  });
  const id = created.registration?.id;
  if (!id) {
    throw new Error("Create registration did not return an id.");
  }
  return id;
}
