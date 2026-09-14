import { expect, type Page } from "@playwright/test";
import { expectGarage, openAddRegistration, waitForGarageList } from "./auth";
import {
  addManually,
  confirmVehicle,
  expirationMonth,
  expirationYear,
  navGarage,
  navSettings,
  registrationNickname,
  saveProfile,
  saveRegistration,
  typePickerPassenger,
  vehicleByNickname,
  vinInput,
  vinLookupSubmit,
} from "./selectors";

/** Well-known Honda Accord VIN — NHTSA decodes this reliably. Applicant-funnel only. */
export const SAMPLE_VIN = "1HGCM82633A004352";

/** Staging `state_rules` is Utah-only. Create must POST `UT`. */
const STAGING_STATE = "UT";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function uniqueE2eNickname(stamp = Date.now()): string {
  return `E2E P1 ${stamp}`;
}

async function selectUtahOption(select: ReturnType<Page["locator"]>) {
  await expect(select).toBeVisible({ timeout: 15_000 });
  const utah = select.locator("option").filter({ hasText: /^Utah\b|^UT$/i }).first();
  const value = (await utah.getAttribute("value")) || STAGING_STATE;
  await select.selectOption(value);
  await select.dispatchEvent("input");
  await select.dispatchEvent("change");
  await expect(select).toHaveValue(value);
  const selected = (await select.inputValue()).trim().toUpperCase();
  if (selected !== "UT" && selected !== "UTAH") {
    throw new Error(`Could not pin state to Utah (got ${selected || "(empty)"})`);
  }
}

/** Settings mailing state can be a non-open code; pin it to Utah before add. */
async function ensureUtahProfile(page: Page) {
  await navSettings(page).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({
    timeout: 20_000,
  });

  const state = page.locator("#settings-state");
  await expect(state).toBeVisible({ timeout: 15_000 });
  if ((await state.inputValue()).trim().toUpperCase() !== STAGING_STATE) {
    await selectUtahOption(state);
    const line1 = page.locator("#settings-line1");
    if (!(await line1.inputValue()).trim()) {
      await line1.fill("123 State St");
      await page.locator("#settings-city").fill("Salt Lake City");
      await page.locator("#settings-zip").fill("84111");
    }
    await saveProfile(page).click();
    await expect(page.getByText("Profile updated.")).toBeVisible({
      timeout: 20_000,
    });
  }

  await navGarage(page).click();
  await expectGarage(page);
}

/** Staging only has Utah state_rules. Pin the identity picker before the draft is created. */
async function ensureUtah(page: Page) {
  await selectUtahOption(page.locator("#state"));
}

async function leaveWaitlistIfNeeded(page: Page) {
  const waitlist = page.getByText(/isn.t live yet/i);
  if (!(await waitlist.isVisible().catch(() => false))) {
    return;
  }
  await page.getByRole("button", { name: /use an available state/i }).click();
  await ensureUtah(page);
}

/** Last calendar month so the vehicle is Expired and renewal can start. */
export async function setExpirationLastMonth(page: Page) {
  const now = new Date();
  const expired = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  await expirationMonth(page).selectOption({
    label: MONTHS[expired.getUTCMonth()],
  });
  await expirationYear(page).selectOption(String(expired.getUTCFullYear()));
}

/**
 * Submit VIN lookup and wait for a real result.
 * Do not treat an idle "Look up VIN" button as done — that locator is hidden
 * until the busy label paints, so a hidden wait resolves immediately.
 */
export async function lookUpVin(page: Page, vin = SAMPLE_VIN) {
  await expect(vinInput(page)).toBeVisible();
  await vinInput(page).fill(vin);

  const confirm = confirmVehicle(page);
  const passenger = typePickerPassenger(page);
  const lookingUp = page.getByRole("button", { name: "Looking up VIN" });
  const addManual = addManually(page);

  await vinLookupSubmit(page).click();

  const sawBusy = await lookingUp
    .waitFor({ state: "visible", timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (sawBusy) {
    await lookingUp.waitFor({ state: "hidden", timeout: 45_000 });
  }

  await expect
    .poll(
      async () => {
        if (await confirm.isVisible().catch(() => false)) return true;
        if (await passenger.isVisible().catch(() => false)) return true;
        const lookupBusy = await lookingUp.isVisible().catch(() => false);
        const manualReady = await addManual.isEnabled().catch(() => false);
        return !lookupBusy && manualReady;
      },
      { timeout: 45_000 },
    )
    .toBe(true);
}

/**
 * Persist via trailer identity so we never VIN-decode a plant/OCR state.
 * Trailer is `decode: none` — Continue copies #state (Utah) onto the draft.
 */
async function reachDetailsViaUtahTrailer(page: Page) {
  const manual = addManually(page);
  if (await manual.isEnabled().catch(() => false)) {
    await expect(manual).toBeEnabled({ timeout: 20_000 });
    await manual.click();
  }

  const trailer = page
    .getByTestId("type-picker-trailer")
    .or(page.getByRole("button", { name: /^Trailer$/i }));
  await expect(trailer).toBeVisible({ timeout: 15_000 });
  await trailer.click();

  await leaveWaitlistIfNeeded(page);
  await ensureUtah(page);

  await page.getByRole("button", { name: /^Continue$/ }).click();
  await leaveWaitlistIfNeeded(page);

  if (await page.locator("#state").isVisible().catch(() => false)) {
    await ensureUtah(page);
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }

  const year = page.locator("#year");
  await expect(year).toBeVisible({ timeout: 15_000 });
  await year.fill("2019");
  await page.locator("#make").fill("E2E");
  await page.locator("#model").fill("Trailer");
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
}

function postedCreateSummary(body: unknown): string {
  if (!body || typeof body !== "object") return "POST body unreadable";
  const record = body as Record<string, unknown>;
  return `POST state=${String(record.state ?? "(missing)")} type=${String(record.type ?? "(missing)")}`;
}

export async function persistNewVehicle(
  page: Page,
  nickname: string,
): Promise<void> {
  await ensureUtahProfile(page);
  await openAddRegistration(page);
  await reachDetailsViaUtahTrailer(page);

  await registrationNickname(page).fill(nickname);
  await setExpirationLastMonth(page);

  const addError = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Add a registration" }) })
    .getByRole("alert");

  const createResponse = page.waitForResponse(
    (response) =>
      /\/api\/registrations\/?$/.test(new URL(response.url()).pathname) &&
      response.request().method() === "POST",
    { timeout: 45_000 },
  );

  await saveRegistration(page).click();
  const posted = await createResponse.catch(() => null);
  const requestSummary = posted
    ? postedCreateSummary(posted.request().postDataJSON())
    : "no POST /api/registrations";

  if (posted && !posted.ok()) {
    let detail = posted.statusText();
    try {
      const body = (await posted.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* keep status text */
    }
    throw new Error(`Add to garage failed: ${detail} (${requestSummary})`);
  }

  await Promise.race([
    page
      .getByRole("heading", { name: "Add a registration" })
      .waitFor({ state: "hidden", timeout: 45_000 }),
    addError.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {
    /* fall through */
  });

  if (await saveRegistration(page).isVisible().catch(() => false)) {
    const text = (await addError.textContent().catch(() => null))?.trim();
    throw new Error(
      `Add to garage failed: ${text || "still on the add form"} (${requestSummary})`,
    );
  }

  await waitForGarageList(page);
  await expect(vehicleByNickname(page, nickname)).toBeVisible({
    timeout: 20_000,
  });
}
