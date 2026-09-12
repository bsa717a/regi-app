import { expect, test } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { signInDemoApplicant } from "../helpers/auth";
import { plateType, plateTypeLegend, platesContinue } from "../helpers/selectors";

test.describe("Utah plate type picker on staging", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test("shows type picker and walks the first happy-path slice", async ({
    page,
  }) => {
    await signInDemoApplicant(page);
    await page.goto("/garage/plates");

    await expect(
      page.getByRole("heading", { name: /Plan your request/i }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(plateTypeLegend(page)).toBeVisible();
    await expect(page.getByText(/In God We Trust/i).first()).toBeVisible();

    await plateType(page, "in_god_we_trust", "In God We Trust").click();
    await platesContinue(page).click();

    await expect(page.getByLabel("First choice (required)")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("First choice (required)").fill("REGI1");
    await platesContinue(page).click();

    await expect(page.getByLabel(/What does this combination mean/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/stripe/i)).toHaveCount(0);
  });
});
