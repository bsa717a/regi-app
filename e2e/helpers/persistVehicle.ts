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

export async function lookUpVin(page: Page, vin = SAMPLE_VIN) {
  await expect(vinInput(page)).toBeVisible();
  await vinInput(page).fill(vin);
  await vinLookupSubmit(page).click();

  const confirm = confirmVehicle(page);
  const passenger = typePickerPassenger(page);
  const lookingUp = page.getByRole("button", { name: "Looking up VIN" });

  await lookingUp.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
    /* decode may finish before the busy label paints */
  });
  await Promise.race([
    confirm.waitFor({ state: "visible", timeout: 45_000 }),
    passenger.waitFor({ state: "visible", timeout: 45_000 }),
    lookingUp.waitFor({ state: "hidden", timeout: 45_000 }),
  ]).catch(() => {
    /* continue once lookup is idle */
  });
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
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    } else {
      await expect(confirm).toBeVisible({ timeout: 20_000 });
      await confirm.click();
    }
  } else {
    await persistViaManualTrailer(page);
    return;
  }

  if (!(await saveRegistration(page).isVisible().catch(() => false))) {
    const continueBtn = page.getByRole("button", { name: "Continue" });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }
  }

  await expect(saveRegistration(page)).toBeVisible({ timeout: 20_000 });
}

async function persistViaManualTrailer(page: Page) {
  const manual = addManually(page);
  if (await manual.isEnabled().catch(() => false)) {
    await manual.click();
  }

  const trailer = page
    .getByTestId("type-picker-trailer")
    .or(page.getByRole("button", { name: /Trailer/i }));
  await expect(trailer).toBeVisible({ timeout: 15_000 });
  await trailer.click();

  const continueBtn = page.getByRole("button", { name: /^Continue$/ });
  await expect(continueBtn).toBeVisible({ timeout: 15_000 });
  await continueBtn.click();

  const year = page.locator("#year");
  if (await year.isVisible().catch(() => false)) {
    await year.fill("2019");
    await page.locator("#make").fill("E2E");
    await page.locator("#model").fill("Trailer");
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

  const addError = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Add a registration" }) })
    .getByRole("alert");
  await saveRegistration(page).click();

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
