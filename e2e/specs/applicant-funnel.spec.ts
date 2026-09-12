import { expect, test, type Page } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { openAddRegistration, signInDemoApplicant } from "../helpers/auth";
import {
  addManually,
  applicantName,
  applicantProfileForm,
  confirmVehicle,
  documentPreviewModal,
  feeEstimate,
  paymentNotRequired,
  renewNow,
  saveProfile,
  submitBlockingReasons,
  submitRenewal,
  typePickerPassenger,
  vehicleItems,
  vinInput,
  vinLookupSubmit,
} from "../helpers/selectors";

const SAMPLE_VIN = "1HGCM82633A004352";

test.describe("Applicant funnel against staging", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test("logs in the verified demo applicant and walks the supported funnel", async ({
    page,
  }) => {
    await signInDemoApplicant(page);

    await fillApplicantProfileFields(page);
    await exerciseRegistrationForm(page);
    await exerciseDocumentPreview(page);
    await exerciseSubmitPath(page);
  });
});

async function fillApplicantProfileFields(page: Page) {
  await page.getByRole("link", { name: "Settings" }).click();
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
  await page.getByRole("link", { name: "Garage" }).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 20_000,
  });

  await openAddRegistration(page);
  await expect(vinInput(page)).toBeVisible();
  await expect(vinLookupSubmit(page)).toBeVisible();

  await vinInput(page).fill(SAMPLE_VIN);
  await vinLookupSubmit(page).click();

  const confirm = confirmVehicle(page);
  const passenger = typePickerPassenger(page);
  const lookingUp = page.getByRole("button", { name: "Looking up VIN" });

  // Wait until the VIN request starts (button disables) so we do not treat
  // the still-idle "Look up VIN" label as done. Then wait for confirm, the
  // type picker, or lookup idle. Do not race on a generic role=alert —
  // AppShell/assistant may already have one. "Or add manually" stays
  // visible-but-disabled while busy.
  await lookingUp.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
    /* decode may finish before the busy label paints */
  });
  await Promise.race([
    confirm.waitFor({ state: "visible", timeout: 45_000 }),
    passenger.waitFor({ state: "visible", timeout: 45_000 }),
    lookingUp.waitFor({ state: "hidden", timeout: 45_000 }),
  ]).catch(() => {
    /* continue to manual picker once lookup is idle */
  });

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
    await page.getByRole("link", { name: "Garage" }).click();
  }
}

async function exerciseDocumentPreview(page: Page) {
  await page.getByRole("link", { name: "Documents" }).click();
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

  await page.getByRole("link", { name: "Garage" }).click();
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
  await page.getByRole("link", { name: "Renewals" }).click();
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
    await page.getByRole("link", { name: "Garage" }).click();
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
