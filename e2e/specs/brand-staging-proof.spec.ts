import { expect, test } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { signInDemoApplicant } from "../helpers/auth";
import {
  navDocuments,
  navGarage,
  navRenewals,
  navSettings,
} from "../helpers/selectors";

/**
 * Phone-viewport walk of the deployed staging brand UI.
 * Screenshots are CI artifacts only (gitignored under e2e/proof).
 */
test.describe("Staging brand UI phone proof", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test("garage, renewals, documents, and settings still navigate", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInDemoApplicant(page);

    await expect(
      page.getByRole("heading", { name: "Garage", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Loading registrations")
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {
        /* already settled */
      });
    await page.screenshot({
      path: "e2e/proof/01-garage.png",
      fullPage: true,
    });

    const garageBanner = page.getByTestId("garage-compliance-banner");
    const emptyGarage = page.getByTestId("garage-empty-state");
    await expect(garageBanner.or(emptyGarage)).toBeVisible({ timeout: 20_000 });

    if (await garageBanner.isVisible().catch(() => false)) {
      const firstVehicle = page.locator("[data-testid^='vehicle-item-']").first();
      await expect(firstVehicle).toBeVisible();
      await firstVehicle.getByRole("button").first().click();
      await expect(firstVehicle.getByRole("button").first()).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    } else {
      await expect(page.getByTestId("add-first-registration-button")).toBeVisible();
      await expect(page.getByTestId("enter-vin-button")).toBeVisible();
    }

    await navRenewals(page).click();
    await expect(page.getByRole("heading", { name: "Renewals" })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: "e2e/proof/02-renewals.png",
      fullPage: true,
    });
    const renewHero = page.getByTestId("renewals-hero");
    const emptyRenewals = page.getByText(/garage is empty/i);
    await expect(renewHero.or(emptyRenewals)).toBeVisible({ timeout: 20_000 });

    await navDocuments(page).click();
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible({
      timeout: 20_000,
    });
    await page
      .getByLabel("Loading document vault")
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => {
        /* already settled */
      });
    const allFilter = page.getByRole("tab", { name: "All" });
    if (await allFilter.isVisible().catch(() => false)) {
      await allFilter.click();
      await expect(allFilter).toHaveAttribute("aria-selected", "true");
    }
    await page.screenshot({
      path: "e2e/proof/03-documents.png",
      fullPage: true,
    });

    await navSettings(page).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("switch", { name: /SMS/i })).toBeVisible();
    await page.getByText("Edit profile", { exact: true }).click();
    await expect(page.getByTestId("applicant-profile-form")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Dark\b/ })).toBeVisible();
    await page.screenshot({
      path: "e2e/proof/04-settings.png",
      fullPage: true,
    });
  });
});
