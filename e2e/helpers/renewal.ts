import { expect, type Page } from "@playwright/test";
import { waitForGarageList } from "./auth";
import { e2ePdfPayload } from "./pdf";
import {
  feeEstimate,
  navGarage,
  paymentNotRequired,
  renewalCounty,
  renewalSubmitted,
  submitBlockingReasons,
  submitRenewal,
  renewalDocSlot,
  uploadDocInput,
  vehicleByNickname,
} from "./selectors";

const REQUIRED_UPLOAD_TYPES = ["registration", "insurance", "emissions"] as const;

export async function startRenewalForNickname(page: Page, nickname: string) {
  await navGarage(page).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 20_000,
  });
  await waitForGarageList(page);

  const item = vehicleByNickname(page, nickname);
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.click();

  const testId = await item.getAttribute("data-testid");
  const vehicleId = testId?.replace(/^vehicle-item-/, "") ?? "";
  const renew = vehicleId
    ? page.getByTestId(`renew-vehicle-${vehicleId}`)
    : page.getByRole("link", { name: "Renew registration" });

  if (await renew.isVisible().catch(() => false)) {
    await renew.click();
  } else if (vehicleId) {
    await page.goto(`/renewals/new?registrationId=${encodeURIComponent(vehicleId)}`);
  } else {
    throw new Error(
      `Could not start renewal for ${nickname} — expand the card and look for Renew registration.`,
    );
  }

  await expect(page).toHaveURL(/\/renewals\/[^/]+/, { timeout: 45_000 });
  await expect(submitRenewal(page).or(renewalSubmitted(page))).toBeVisible({
    timeout: 30_000,
  });
}

export async function selectCountyIfNeeded(page: Page, county = "Other") {
  const select = renewalCounty(page);
  if (!(await select.isVisible().catch(() => false))) {
    return;
  }
  await select.selectOption(county);
  await expect(select).toBeEnabled({ timeout: 20_000 });
  await expect(select).toHaveValue(county, { timeout: 20_000 });
}

export async function uploadMissingRenewalDocs(page: Page, stamp: number) {
  for (const type of REQUIRED_UPLOAD_TYPES) {
    const input = uploadDocInput(page, type);
    if (!(await input.count().then((n) => n > 0).catch(() => false))) {
      continue;
    }
    const article = page
      .locator("article")
      .filter({ has: page.getByTestId(`upload-doc-${type}`) })
      .or(renewalDocSlot(page, type));
    const needed = article
      .getByText("Needed", { exact: true })
      .or(article.locator("text=Needed"));
    if (!(await needed.isVisible().catch(() => false))) {
      continue;
    }

    const filename = `e2e-${type}-${stamp}.pdf`;
    await input.setInputFiles(e2ePdfPayload(filename));
    const slotError = article.getByRole("alert");
    await Promise.race([
      article.getByText("Uploaded", { exact: true }).waitFor({
        state: "visible",
        timeout: 45_000,
      }),
      slotError.waitFor({ state: "visible", timeout: 45_000 }),
    ]).catch(() => {
      /* fall through */
    });
    if (await slotError.isVisible().catch(() => false)) {
      const text = (await slotError.textContent())?.trim() ?? "unknown error";
      throw new Error(`Renewal ${type} upload failed: ${text}`);
    }
    await expect(article.getByText("Uploaded", { exact: true })).toBeVisible({
      timeout: 5_000,
    });
  }
}

/**
 * Upload required docs, pick county when asked, and click Submit when enabled.
 * Success is DocumentsReceived ("You're all set") — no Stripe.
 */
export async function submitRenewalWithoutStripe(page: Page, stamp: number) {
  if (await renewalSubmitted(page).isVisible().catch(() => false)) {
    await expect(page.getByText(/stripe/i)).toHaveCount(0);
    return "already-submitted" as const;
  }

  await expect(submitRenewal(page)).toBeVisible({ timeout: 25_000 });
  await expect(feeEstimate(page)).toBeVisible();
  await expect(paymentNotRequired(page)).toBeVisible();
  await expect(page.getByText(/stripe/i)).toHaveCount(0);

  await selectCountyIfNeeded(page);
  await uploadMissingRenewalDocs(page, stamp);

  const submit = submitRenewal(page);
  if (await submit.isDisabled()) {
    await expect(submitBlockingReasons(page)).toBeVisible();
    const title = await submit.getAttribute("title");
    const reasons =
      (await submitBlockingReasons(page).textContent())?.trim() ?? title ?? "";
    throw new Error(
      `Submit renewal stayed disabled after uploads. ${reasons} Stripe remains skipped.`,
    );
  }

  await submit.click();
  await expect(renewalSubmitted(page)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(/You.re all set|We.re on it/i)).toBeVisible();
  await expect(page.getByText(/stripe/i)).toHaveCount(0);
  await expect(submitRenewal(page)).toHaveCount(0);
  return "submitted" as const;
}
