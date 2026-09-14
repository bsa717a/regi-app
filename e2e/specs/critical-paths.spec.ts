import { expect, test } from "@playwright/test";
import { removeVehicleByNickname } from "../helpers/cleanup";
import { uploadVaultPdf } from "../helpers/documents";
import { persistNewVehicle, uniqueE2eNickname } from "../helpers/persistVehicle";
import {
  startRenewalForNickname,
  submitRenewalWithoutStripe,
} from "../helpers/renewal";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { signInDemoApplicant } from "../helpers/auth";

/**
 * P1 critical paths against durable staging.
 * Serial so persist → vault upload → renewal submit share one demo vehicle.
 * Stripe / admin / signup+verify stay parked.
 */
test.describe.configure({ mode: "serial" });

let createdNickname = "";
const stamp = Date.now();

test.describe("P1 critical paths against staging", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test.afterAll(async ({ browser }) => {
    if (!createdNickname || !hasDemoPassword()) return;
    const page = await browser.newPage();
    try {
      await signInDemoApplicant(page);
      await removeVehicleByNickname(page, createdNickname);
    } catch {
      /* Best-effort: leftover E2E P1 rows are identifiable by nickname. */
    } finally {
      await page.close();
    }
  });

  test("persists a new vehicle from add-registration (not VIN picker only)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    createdNickname = uniqueE2eNickname(stamp);
    await signInDemoApplicant(page);
    await persistNewVehicle(page, createdNickname);
    await expect(page.getByRole("heading", { name: createdNickname })).toBeVisible();
  });

  test("uploads a document to the vault (not preview-only)", async ({ page }) => {
    test.skip(!createdNickname, "Persist step did not create a vehicle.");
    const filename = `e2e-vault-${stamp}.pdf`;
    await signInDemoApplicant(page);
    await uploadVaultPdf(page, {
      nickname: createdNickname,
      filename,
      typeLabel: "Other",
    });
    await expect(page.getByText(filename, { exact: true })).toBeVisible();
  });

  test("starts renewal and submits without Stripe", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!createdNickname, "Persist step did not create a vehicle.");
    await signInDemoApplicant(page);
    await startRenewalForNickname(page, createdNickname);
    const result = await submitRenewalWithoutStripe(page, stamp);
    test.info().annotations.push({
      type: "note",
      description: `Renewal path: ${result}. Stripe checkout remains skipped.`,
    });
  });
});
