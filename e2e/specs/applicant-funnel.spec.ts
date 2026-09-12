import { expect, test, type Page } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { openAddRegistration, signInDemoApplicant } from "../helpers/auth";

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
  await expect(page.getByTestId("applicant-profile-form")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Signed in as/i)).toBeVisible();

  const name = page.getByTestId("applicant-name");
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
  await expect(page.getByTestId("save-profile-button")).toBeVisible();
}

async function exerciseRegistrationForm(page: Page) {
  await page.getByRole("link", { name: "Garage" }).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 20_000,
  });

  await openAddRegistration(page);
  await expect(page.getByTestId("vin-lookup-form")).toBeVisible();
  await expect(page.getByTestId("vin-input")).toBeVisible();
  await expect(page.getByTestId("vin-lookup-submit")).toBeVisible();

  await page.getByTestId("vin-input").fill(SAMPLE_VIN);
  await page.getByTestId("vin-lookup-submit").click();

  const confirm = page.getByTestId("confirm-vehicle-button");
  const typePicker = page.getByTestId("type-picker-grid");
  const vinAlert = page.getByRole("alert");

  await Promise.race([
    confirm.waitFor({ state: "visible", timeout: 25_000 }),
    typePicker.waitFor({ state: "visible", timeout: 25_000 }),
    vinAlert.waitFor({ state: "visible", timeout: 25_000 }),
  ]).catch(() => {
    /* continue to manual picker */
  });

  if (await confirm.isVisible().catch(() => false)) {
    await expect(confirm).toBeVisible();
  } else {
    if (await page.getByTestId("add-manually-button").isVisible().catch(() => false)) {
      await page.getByTestId("add-manually-button").click();
    }
    await expect(page.getByTestId("type-picker-grid")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("type-picker-passenger")).toBeVisible();
    await page.getByTestId("type-picker-passenger").click();
    await expect(page.getByText(/Registration type/i)).toBeVisible({
      timeout: 10_000,
    });
  }

  // Do not save a new vehicle — keep staging garage stable.
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

  const viewButtons = page.locator("[data-testid^='view-document-']");
  if ((await viewButtons.count()) > 0) {
    await viewButtons.first().click();
    await expect(page.getByTestId("document-preview-modal")).toBeVisible({
      timeout: 20_000,
    });
    await page.keyboard.press("Escape");
    return;
  }

  await page.getByRole("link", { name: "Garage" }).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 15_000,
  });
  const firstVehicle = page.locator("[data-testid^='vehicle-item-']").first();
  if ((await firstVehicle.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description: "No garage vehicles — skipped card preview.",
    });
    return;
  }
  await firstVehicle.locator("[data-testid^='vehicle-expand-']").click();
  const card = page.locator("[data-testid^='view-registration-card-']").first();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    await expect(page.getByTestId("document-preview-modal")).toBeVisible({
      timeout: 20_000,
    });
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

  const renewNow = page.getByTestId("renew-now-button");
  const renewLink = page.getByRole("link", { name: /Renew Registration/i }).first();

  if (await renewNow.isEnabled().catch(() => false)) {
    await renewNow.click();
  } else if (await renewLink.isVisible().catch(() => false)) {
    await renewLink.click();
  } else {
    await page.getByRole("link", { name: "Garage" }).click();
    const vehicle = page.locator("[data-testid^='vehicle-item-']").first();
    if ((await vehicle.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "Empty garage — submit path limited to add-registration UI.",
      });
      return;
    }
    await vehicle.locator("[data-testid^='vehicle-expand-']").click();
    const renew = page.locator("[data-testid^='renew-vehicle-']").first();
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
  await expect(page.getByTestId("submit-renewal-button")).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.getByTestId("fee-estimate")).toBeVisible();
  await expect(page.getByTestId("payment-not-required")).toBeVisible();
  await expect(page.getByTestId("payment-not-required")).toContainText(
    /No payment required/i,
  );
  await expect(page.getByText(/stripe/i)).toHaveCount(0);

  const submit = page.getByTestId("submit-renewal-button");
  if (await submit.isDisabled()) {
    await expect(page.getByTestId("submit-blocking-reasons")).toBeVisible();
    await expect(page.getByTestId("submit-blocking-reasons")).toContainText(
      /Complete these items to submit/i,
    );
    const title = await submit.getAttribute("title");
    expect(title ?? "").toMatch(/Submit is disabled/i);
  }

  const viewDoc = page.locator("[data-testid^='view-document-']").first();
  if (await viewDoc.isVisible().catch(() => false)) {
    await viewDoc.click();
    await expect(page.getByTestId("document-preview-modal")).toBeVisible({
      timeout: 20_000,
    });
    await page.keyboard.press("Escape");
  }
}
