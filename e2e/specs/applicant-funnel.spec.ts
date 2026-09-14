import { expect, test, type Page } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { openAddRegistration, signInDemoApplicant } from "../helpers/auth";
import { lookUpVin } from "../helpers/persistVehicle";
import {
  addManually,
  applicantName,
  applicantProfileForm,
  confirmVehicle,
  documentPreviewModal,
  feeEstimate,
  navDocuments,
  navGarage,
  navRenewals,
  navSettings,
  paymentNotRequired,
  renewNow,
  saveProfile,
  submitBlockingReasons,
  submitRenewal,
  typePickerPassenger,
  vehicleItems,
} from "../helpers/selectors";

test.describe("Applicant funnel against staging", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test("logs in the verified demo applicant and walks the supported funnel", async ({
    page,
  }) => {
    await signInDemoApplicant(page);

    await fillApplicantProfileFields(page);
    // VIN / type picker only — persist, vault upload, and submit success
    // live in e2e/specs/critical-paths.spec.ts.
    await exerciseRegistrationForm(page);
    await exerciseDocumentPreview(page);
    await exerciseSubmitPath(page);
  });
});

async function fillApplicantProfileFields(page: Page) {
  await navSettings(page).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(applicantProfileForm(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Signed in as/i)).toBeVisible();

  const name = applicantName(page);
  const current = await name.inputValue();
  if (!current.trim()) {
    await name.fill("Demo Applicant");
  } else {
    await name.click();
    await name.press("End");
  }
  await expect(page.getByLabel("Street address")).toBeVisible();
  await expect(page.getByLabel("City")).toBeVisible();
  await expect(page.getByLabel("ZIP")).toBeVisible();
  await expect(saveProfile(page)).toBeVisible();
}

async function exerciseRegistrationForm(page: Page) {
  await navGarage(page).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 20_000,
  });

  await openAddRegistration(page);
  await lookUpVin(page);

  const confirm = confirmVehicle(page);
  const passenger = typePickerPassenger(page);

  if (await confirm.isVisible().catch(() => false)) {
    await expect(confirm).toBeVisible();
  } else if (await passenger.isVisible().catch(() => false)) {
    await passenger.click();
    await expect(page.getByText(/Registration type/i)).toBeVisible({
      timeout: 10_000,
    });
  } else {
    const manual = addManually(page);
    if (await manual.isEnabled().catch(() => false)) {
      await manual.click();
    }
    await expect(typePickerPassenger(page)).toBeVisible({ timeout: 15_000 });
    await typePickerPassenger(page).click();
    await expect(page.getByText(/Registration type/i)).toBeVisible({
      timeout: 10_000,
    });
  }

  const backToGarage = page.getByRole("button", { name: /Back to garage/i });
  if (await backToGarage.isVisible().catch(() => false)) {
    await backToGarage.click();
  } else {
    await navGarage(page).click();
  }
}

async function exerciseDocumentPreview(page: Page) {
  await navDocuments(page).click();
  await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible({
    timeout: 20_000,
  });

  const viewButtons = page
    .locator("[data-testid^='view-document-']")
    .or(page.getByRole("button", { name: /View(\/rename)?/ }));
  if ((await viewButtons.count()) > 0 && (await viewButtons.first().isVisible().catch(() => false))) {
    await viewButtons.first().click();
    await expect(documentPreviewModal(page)).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    return;
  }

  await navGarage(page).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 15_000,
  });
  const firstVehicle = vehicleItems(page).first();
  if ((await firstVehicle.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description: "No garage vehicles — skipped card preview.",
    });
    return;
  }
  await firstVehicle.click();
  const card = page.getByRole("button", { name: "View registration card" });
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await expect(documentPreviewModal(page)).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press("Escape");
  } else {
    test.info().annotations.push({
      type: "note",
      description: "No registration-card document on the first vehicle.",
    });
  }
}

async function exerciseSubmitPath(page: Page) {
  await navRenewals(page).click();
  await expect(page.getByRole("heading", { name: "Renewals" })).toBeVisible({
    timeout: 20_000,
  });

  const now = renewNow(page);
  const renewLink = page.getByRole("link", { name: /Renew Registration/i }).first();

  if (await now.isEnabled().catch(() => false)) {
    await now.click();
  } else if (await renewLink.isVisible().catch(() => false)) {
    await renewLink.click();
  } else {
    await navGarage(page).click();
    const vehicle = vehicleItems(page).first();
    if ((await vehicle.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "Empty garage — submit path limited to add-registration UI.",
      });
      return;
    }
    await vehicle.click();
    const renew = page.getByRole("link", { name: "Renew registration" }).first();
    if (await renew.isVisible().catch(() => false)) {
      await renew.click();
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "No due/expired vehicle — submit path not started. Stripe remains skipped.",
      });
      return;
    }
  }

  await expect(page).toHaveURL(/\/renewals\//, { timeout: 30_000 });
  await expect(submitRenewal(page)).toBeVisible({ timeout: 25_000 });
  await expect(feeEstimate(page)).toBeVisible();
  await expect(paymentNotRequired(page)).toBeVisible();
  await expect(page.getByText(/stripe/i)).toHaveCount(0);

  if (await submitRenewal(page).isDisabled()) {
    await expect(submitBlockingReasons(page)).toBeVisible();
    const title = await submitRenewal(page).getAttribute("title");
    if (title) {
      expect(title).toMatch(/Submit is disabled/i);
    }
  }

  const viewDoc = page
    .locator("[data-testid^='view-document-']")
    .or(page.getByRole("button", { name: "View" }))
    .first();
  if (await viewDoc.isVisible().catch(() => false)) {
    await viewDoc.click();
    await expect(documentPreviewModal(page)).toBeVisible({ timeout: 20_000 });
    await page.keyboard.press("Escape");
  }
}
