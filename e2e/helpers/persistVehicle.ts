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

/** Staging only has Utah state_rules. Pin the identity picker before the draft is created. */
async function ensureUtah(page: Page) {
  const state = page.locator("#state");
  await expect(state).toBeVisible({ timeout: 15_000 });
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
 * Persist via the identity form so we can set State = Utah before create.
 * Pick-type VIN → confirm skips #state; a decoded plant/OCR state is not
 * an open staging state and POST /api/registrations returns waitlist.
 */
async function reachDetailsViaUtahIdentity(page: Page) {
  const manual = addManually(page);
  await expect(manual).toBeEnabled({ timeout: 20_000 });
  await manual.click();

  await expect(typePickerPassenger(page)).toBeVisible({ timeout: 15_000 });
  await typePickerPassenger(page).click();

  await ensureUtah(page);

  const identityVin = page.locator("#vin");
  await expect(identityVin).toBeVisible({ timeout: 10_000 });
  await identityVin.fill(SAMPLE_VIN);

  await page.getByRole("button", { name: /^Continue$/ }).click();

  const confirm = confirmVehicle(page);
  const year = page.locator("#year");
  const ymmYear = page.locator("#ymm-year");
  const waitlist = page.getByText(/isn.t live yet/i);

  await Promise.race([
    confirm.waitFor({ state: "visible", timeout: 45_000 }),
    saveRegistration(page).waitFor({ state: "visible", timeout: 45_000 }),
    year.waitFor({ state: "visible", timeout: 45_000 }),
    ymmYear.waitFor({ state: "visible", timeout: 45_000 }),
    waitlist.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {
    /* inspect below */
  });

  if (await waitlist.isVisible().catch(() => false)) {
    throw new Error(
      "Add-registration entered the waitlist. State must be Utah (UT) on staging.",
    );
  }

  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  } else if (await year.isVisible().catch(() => false)) {
    await year.fill("2003");
    await page.locator("#make").fill("Honda");
    await page.locator("#model").fill("Accord");
    await page.getByRole("button", { name: /^Continue$/ }).click();
  } else if (await ymmYear.isVisible().catch(() => false)) {
    await persistViaManualTrailer(page);
    return;
  }

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
}

async function persistViaManualTrailer(page: Page) {
  const changeType = page.getByRole("button", { name: /change type|Back/i });
  if (await changeType.isVisible().catch(() => false)) {
    await changeType.click();
  } else {
    const back = page.getByRole("button", { name: /Back to garage/i });
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await openAddRegistration(page);
    }
    const manual = addManually(page);
    if (await manual.isEnabled().catch(() => false)) {
      await manual.click();
    }
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
  await page.getByRole("button", { name: /^Continue$/ }).click();

  const year = page.locator("#year");
  await expect(year).toBeVisible({ timeout: 15_000 });
  await year.fill("2019");
  await page.locator("#make").fill("E2E");
  await page.locator("#model").fill("Trailer");
  await page.getByRole("button", { name: /^Continue$/ }).click();

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
}

export async function persistNewVehicle(
  page: Page,
  nickname: string,
): Promise<void> {
  await openAddRegistration(page);
  await reachDetailsViaUtahIdentity(page);

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
