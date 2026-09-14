import { expect, type Page } from "@playwright/test";
import { waitForGarageList } from "./auth";
import {
  confirmRemoveRegistration,
  editRegistration,
  navGarage,
  removeRegistration,
  vehicleByNickname,
} from "./selectors";

/** Best-effort garage cleanup so the shared demo account does not accumulate E2E rows. */
export async function removeVehicleByNickname(page: Page, nickname: string) {
  await navGarage(page).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 20_000,
  });
  await waitForGarageList(page);

  const item = vehicleByNickname(page, nickname);
  if (!(await item.isVisible().catch(() => false))) {
    return;
  }

  await item.click();
  const testId = await item.getAttribute("data-testid");
  const vehicleId = testId?.replace(/^vehicle-item-/, "");
  await editRegistration(page, vehicleId).click();
  await expect(
    page.getByRole("heading", { name: "Edit registration" }),
  ).toBeVisible({ timeout: 15_000 });
  await removeRegistration(page).click();
  await confirmRemoveRegistration(page).click();
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 30_000,
  });
  await waitForGarageList(page);
  await expect(item).toHaveCount(0);
}
