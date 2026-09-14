import { expect, type Page } from "@playwright/test";
import { openAddRegistration, waitForGarageList } from "./auth";
import {
  addManually,
  confirmVehicle,
  expirationMonth,
  expirationYear,
  registrationNickname,
  saveRegistration,
  typePickerPassenger,
  vehicleByNickname,
  vinInput,
  vinLookupSubmit,
} from "./selectors";

/** Well-known Honda Accord VIN — NHTSA decodes this reliably. */
export const SAMPLE_VIN = "1HGCM82633A004352";

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

async function ensureUtah(page: Page) {
  const state = page.locator("#state");
  if (!(await state.isVisible().catch(() => false))) return;
  await state.selectOption("UT");
  await expect(state).toHaveValue("UT");
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
 * Drive add-registration through VIN (preferred) or a manual trailer fallback
 * until the details step ("Add to garage") is visible.
 */
export async function reachRegistrationDetails(page: Page) {
  await lookUpVin(page);

  const confirm = confirmVehicle(page);
  const passenger = typePickerPassenger(page);

  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  } else if (await passenger.isVisible().catch(() => false)) {
    await passenger.click();
    await expect(confirm).toBeVisible({ timeout: 20_000 });
    await confirm.click();
  } else {
    await persistViaManualTrailer(page);
    await ensureUtah(page);
    return;
  }

  if (!(await saveRegistration(page).isVisible().catch(() => false))) {
    await ensureUtah(page);
    const continueBtn = page.getByRole("button", { name: /^Continue$/ });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }
  }

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
  await ensureUtah(page);
}

async function persistViaManualTrailer(page: Page) {
  const lookingUp = page.getByRole("button", { name: "Looking up VIN" });
  await lookingUp.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {
    /* already idle */
  });

  const manual = addManually(page);
  if (await manual.isEnabled().catch(() => false)) {
    await manual.click();
  }

  const trailer = page
    .getByTestId("type-picker-trailer")
    .or(page.getByRole("button", { name: /^Trailer$/i }));
  await expect(trailer).toBeVisible({ timeout: 15_000 });
  await trailer.click();

  if (await confirmVehicle(page).isVisible().catch(() => false)) {
    await confirmVehicle(page).click();
    await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
    return;
  }

  await ensureUtah(page);
  const continueBtn = page.getByRole("button", { name: /^Continue$/ });
  await expect(continueBtn).toBeVisible({ timeout: 15_000 });
  await continueBtn.click();

  const year = page.locator("#year");
  if (await year.isVisible().catch(() => false)) {
    await year.fill("2019");
    await page.locator("#make").fill("E2E");
    await page.locator("#model").fill("Trailer");
    await ensureUtah(page);
    await page.getByRole("button", { name: /^Continue$/ }).click();
  }

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
}

export async function persistNewVehicle(
  page: Page,
  nickname: string,
): Promise<void> {
  await openAddRegistration(page);
  await reachRegistrationDetails(page);

  await registrationNickname(page).fill(nickname);
  await setExpirationLastMonth(page);
  await ensureUtah(page);

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

  if (posted && !posted.ok()) {
    let detail = posted.statusText();
    try {
      const body = (await posted.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* keep status text */
    }
    throw new Error(`Add to garage failed: ${detail}`);
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
    throw new Error(`Add to garage failed: ${text || "still on the add form"}`);
  }

  await waitForGarageList(page);
  await expect(vehicleByNickname(page, nickname)).toBeVisible({
    timeout: 20_000,
  });
}
