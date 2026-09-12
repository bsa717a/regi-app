import { expect, test } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { signInDemoApplicant } from "../helpers/auth";

test.describe("Utah plate type picker on staging", () => {
  test.beforeEach(() => {
    test.skip(!hasDemoPassword(), missingPasswordMessage());
  });

  test("shows type previews and walks the first happy-path slice", async ({
    page,
  }) => {
    await signInDemoApplicant(page);
    await page.goto("/garage/plates");

    await expect(
      page.getByRole("heading", { name: /Plan your request/i }),
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("plate-type-picker")).toBeVisible();
    await expect(
      page.getByTestId("utah-plate-type-standard_life_elevated_arches"),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Utah Life Elevated Arches license plate" }),
    ).toBeVisible();

    await page.getByTestId("utah-plate-type-in_god_we_trust").click();
    await page.getByTestId("plates-continue").click();

    await expect(page.getByLabel("First choice (required)")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("First choice (required)").fill("REGI01");
    await page.getByTestId("plates-continue").click();

    await expect(page.getByLabel(/What does this combination mean/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/stripe/i)).toHaveCount(0);
  });
});
