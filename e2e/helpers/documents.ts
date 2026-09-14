import { expect, type Page } from "@playwright/test";
import { e2ePdfPayload } from "./pdf";
import {
  navDocuments,
  uploadDocTypeSelect,
  uploadDocumentButton,
  uploadDocumentEmptyButton,
  uploadVaultDialog,
  uploadVaultFile,
  uploadVaultSubmit,
  uploadVehicleSelect,
  vaultVehicleFilter,
} from "./selectors";

export async function openVaultUpload(page: Page) {
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
  await page
    .getByLabel("Loading documents")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {
      /* already settled */
    });

  const header = uploadDocumentButton(page);
  const empty = uploadDocumentEmptyButton(page);
  if (await header.isVisible().catch(() => false)) {
    await header.click();
  } else if (await empty.isVisible().catch(() => false)) {
    await empty.click();
  } else {
    throw new Error(
      "No Upload control on Documents — garage may be empty (persist vehicle first).",
    );
  }

  await expect(uploadVaultDialog(page)).toBeVisible({ timeout: 15_000 });
}

export async function uploadVaultPdf(
  page: Page,
  input: { nickname: string; filename: string; typeLabel?: string },
) {
  await openVaultUpload(page);

  const vehicleSelect = uploadVehicleSelect(page);
  if (await vehicleSelect.isVisible().catch(() => false)) {
    const option = vehicleSelect.locator("option", { hasText: input.nickname });
    const value = await option.getAttribute("value");
    if (!value) {
      throw new Error(`Upload sheet has no registration option for ${input.nickname}`);
    }
    await vehicleSelect.selectOption(value);
  } else {
    await expect(page.getByText(input.nickname)).toBeVisible({
      timeout: 10_000,
    });
  }

  if (input.typeLabel) {
    await uploadDocTypeSelect(page).selectOption({ label: input.typeLabel });
  }

  await uploadVaultFile(page).setInputFiles(e2ePdfPayload(input.filename));
  await expect(uploadVaultSubmit(page)).toBeEnabled({ timeout: 10_000 });
  await uploadVaultSubmit(page).click();

  const uploadError = uploadVaultDialog(page).getByRole("alert");
  await Promise.race([
    uploadVaultDialog(page).waitFor({ state: "hidden", timeout: 45_000 }),
    uploadError.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {
    /* fall through */
  });
  if (await uploadError.isVisible().catch(() => false)) {
    const text = (await uploadError.textContent())?.trim() ?? "unknown error";
    throw new Error(`Vault upload failed: ${text}`);
  }
  await expect(uploadVaultDialog(page)).toBeHidden({ timeout: 5_000 });

  const filter = vaultVehicleFilter(page);
  if (await filter.isVisible().catch(() => false)) {
    const option = filter.locator("option", { hasText: input.nickname });
    const value = await option.getAttribute("value");
    if (value) {
      await filter.selectOption(value);
    }
  }

  await expect(page.getByText(input.filename, { exact: true })).toBeVisible({
    timeout: 20_000,
  });
}
