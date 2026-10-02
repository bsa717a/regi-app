/**
 * Staging walk for garage-header screenshots.
 * Not part of `npm run test:e2e` (that suite only matches e2e/specs).
 * Staging host only. Never production.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const STAGING_ORIGIN = "https://regi-staging-90502049802.us-central1.run.app";

// Same acceptance as GARAGE_PAGE_HEADING: the title still on durable
// staging ("Garage") and the personalized header ("Your Garage", "Derek's Garage").
const GARAGE_HEADING = /^(?:Garage|.+ Garage)$/;

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
let failure = null;

try {
  await page.goto(`${STAGING_ORIGIN}/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  let hasWordmark = await waitForGarage(page);
  await captureToken();

  const existing = await api(token, "/api/registrations");
  const rows = existing.registrations ?? [];
  const garageWasEmpty = rows.length === 0;
  if (garageWasEmpty) {
    await waitForEmptyGarage(page);
    await shot(page, "garage-empty.png");

    createdId = await seedVehicle(page, token);
    await page.reload({ waitUntil: "domcontentloaded" });
    hasWordmark = (await waitForGarage(page)) || hasWordmark;
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
  } else {
    // Shared demo account is not guaranteed empty. Do not delete its vehicles.
    console.log(
      `Demo garage already has ${rows.length} vehicle(s). Leaving them in place and skipping the empty shot.`,
    );
    await shot(page, "garage-filled.png");
  }

  if (!hasWordmark) {
    console.log(
      "This host still has the pre-personalization garage header. Skipping the Your Garage fallback shot.",
    );
  } else {
    await presentNamelessProfile(page);
    await waitForGarage(page);
    await page
      .getByRole("heading", { level: 1, name: "Your Garage", exact: true })
      .waitFor({
        state: "visible",
        timeout: 20_000,
      });
    if (garageWasEmpty) {
      await waitForEmptyGarage(page);
    }
    await shot(page, "garage-your-garage-fallback.png");
  }
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
  const heading = page.getByRole("heading", {
    level: 1,
    name: GARAGE_HEADING,
  });
  await heading.waitFor({ state: "visible", timeout: 45_000 });

  const logo = page.getByTestId("regi-logo");
  const hasWordmark = (await logo.count()) > 0;
  if (hasWordmark) {
    await logo.waitFor({ state: "visible", timeout: 10_000 });
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
  }

  await page
    .getByLabel("Loading registrations")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {});
  return hasWordmark;
}

async function waitForEmptyGarage(page) {
  await page
    .getByTestId("garage-empty-state")
    .or(page.getByRole("heading", { name: /garage is empty/i }))
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
}

function isMeUrl(url) {
  try {
    return new URL(url).pathname === "/api/me";
  } catch {
    return false;
  }
}

async function presentNamelessProfile(page) {
  // PATCH { name: null } does not survive the next load. AuthProvider posts
  // the Firebase displayName, and getOrCreateUser writes the token name back,
  // so the heading stays personalized. Serve this page a nameless profile
  // instead of mutating the shared demo account.
  await page.route(/\/api\/me(?:\?|#|$)/, async (route) => {
    const response = await route.fetch();
    const text = await response.text();
    let body = text;
    const headers = { ...response.headers() };
    delete headers["content-encoding"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    if (response.ok()) {
      try {
        const json = text ? JSON.parse(text) : null;
        if (json && typeof json === "object" && json.user) {
          json.user.name = null;
        }
        body = JSON.stringify(json);
        headers["content-type"] = "application/json";
      } catch {
        body = text;
      }
    }
    await route.fulfill({
      status: response.status(),
      headers,
      body,
    });
  });
  const profileLoaded = page.waitForResponse(
    (response) =>
      isMeUrl(response.url()) &&
      response.request().method() !== "OPTIONS" &&
      response.ok(),
    { timeout: 20_000 },
  );
  await page.goto(`${STAGING_ORIGIN}/garage`, { waitUntil: "domcontentloaded" });
  await profileLoaded;
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

function summarizeStates(body) {
  if (!body || typeof body !== "object") {
    return String(body).slice(0, 180);
  }
  const states = Array.isArray(body.states) ? body.states : null;
  const codes = (states ?? [])
    .map((row) => row?.code)
    .filter(Boolean)
    .slice(0, 8);
  return `keys=${Object.keys(body).join(",") || "(none)"} states=${states ? states.length : "missing"} codes=${codes.join(",") || "(none)"}`;
}

async function listStates(page, authToken) {
  let fromNode = null;
  let nodeError = null;
  try {
    fromNode = await api(authToken, "/api/states");
  } catch (err) {
    nodeError = err instanceof Error ? err.message : String(err);
  }
  const nodeStates = Array.isArray(fromNode?.states) ? fromNode.states : [];
  if (nodeStates.length > 0) return nodeStates;

  const fromPage = await page.evaluate(async (token) => {
    const res = await fetch("/api/states", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    return { status: res.status, text: text.slice(0, 400) };
  }, authToken);
  let pageStates = [];
  try {
    const parsed = JSON.parse(fromPage.text);
    if (Array.isArray(parsed?.states)) pageStates = parsed.states;
  } catch {
    pageStates = [];
  }
  console.log(
    `GET /api/states node=${nodeError || summarizeStates(fromNode)} page=${fromPage.status} ${fromPage.text.slice(0, 180)}`,
  );
  return pageStates;
}

async function seedVehicle(page, authToken) {
  const states = await listStates(page, authToken);
  const state = states.find((row) => row.code === "UT") ?? states[0];
  // AddRegistrationFlow already defaults to Utah. The server's state_rules
  // row is what actually allows the create, so an empty /api/states list
  // (unparseable config, or a list the client could not read) still posts UT.
  const stateCode = state?.code || "UT";
  const passenger = (state?.registrationTypes ?? []).find(
    (row) => row.type === "passenger",
  );
  const type =
    passenger?.type ?? state?.registrationTypes?.[0]?.type ?? "passenger";
  if (!state) {
    console.log("No active state listed. Posting UT passenger anyway.");
  }
  const created = await api(authToken, "/api/registrations", {
    method: "POST",
    body: JSON.stringify({
      type,
      state: stateCode,
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
