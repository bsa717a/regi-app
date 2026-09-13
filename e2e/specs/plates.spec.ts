import { expect, test } from "@playwright/test";
import { hasDemoPassword, missingPasswordMessage } from "../env";
import { signInDemoApplicant } from "../helpers/auth";
import {
  plateType,
  plateTypeLegend,
  platesBackToGarage,
  platesContinue,
  utahOpenOrderPlates,
  utahOrderPacket,
} from "../helpers/selectors";

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

  test("selects a specific special-group design when catalog cards are deployed", async ({
    page,
  }) => {
    await signInDemoApplicant(page);
    await page.goto("/garage/plates");

    await expect(
      page.getByRole("heading", { name: /Plan your request/i }),
    ).toBeVisible({ timeout: 25_000 });

    const elk = page.getByTestId("utah-plate-type-special_group_wildlife_elk");
    test.skip(
      !(await elk.isVisible().catch(() => false)),
      "Selectable special-group designs are not on this staging deploy yet. Hub should re-walk after this PR is on regi-staging.",
    );

    await elk.click();
    await expect(elk.locator('input[name="utah-plate-type"]')).toBeChecked();
    await platesContinue(page).click();
    await expect(
      page.getByText(/Wildlife Elk allows up to 5 characters/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("selected-plate-design")).toContainText(
      "Wildlife Elk",
    );
  });

  test("selects motorcycle and radio designs when catalog cards are deployed", async ({
    page,
  }) => {
    await signInDemoApplicant(page);
    await page.goto("/garage/plates");

    await expect(
      page.getByRole("heading", { name: /Plan your request/i }),
    ).toBeVisible({ timeout: 25_000 });

    const motoArches = page.getByTestId(
      "utah-plate-type-motorcycle_life_elevated_arches",
    );
    const amateur = page.getByTestId("utah-plate-type-radio_amateur");
    test.skip(
      !(await motoArches.isVisible().catch(() => false)) ||
        !(await amateur.isVisible().catch(() => false)),
      "Selectable motorcycle/radio designs are not on this staging deploy yet. Hub should re-walk after this PR is on regi-staging.",
    );

    await motoArches.scrollIntoViewIfNeeded();
    await motoArches.click();
    await expect(motoArches.locator('input[name="utah-plate-type"]')).toBeChecked();
    await platesContinue(page).click();
    await expect(
      page.getByText(/Motorcycle Life Elevated Arches allows up to 5 characters/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("selected-plate-design")).toContainText(
      "Motorcycle Life Elevated Arches",
    );

    await page.getByRole("button", { name: /back/i }).click();
    await amateur.scrollIntoViewIfNeeded();
    await amateur.click();
    await platesContinue(page).click();
    await expect(
      page.getByText(/Amateur Radio allows up to 6 characters/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("selected-plate-design")).toContainText(
      "Amateur Radio",
    );
  });

  test("end screen uses Order Plates handoff when this branch is on staging", async ({
    page,
  }) => {
    await signInDemoApplicant(page);
    await page.goto("/garage/plates");

    await expect(
      page.getByRole("heading", { name: /Plan your request/i }),
    ).toBeVisible({ timeout: 25_000 });

    await platesContinue(page).click();
    await page.getByLabel("First choice (required)").fill("REGI01");
    await platesContinue(page).click();
    await page.getByLabel(/What does this combination mean/i).fill("Family nickname");
    await platesContinue(page).click();
    await expect(page.getByText("Soft content check")).toBeVisible({
      timeout: 10_000,
    });
    await platesContinue(page).click();
    await expect(page.getByText("Fee estimate")).toBeVisible();
    await platesContinue(page).click();

    test.skip(
      !(await utahOrderPacket(page).isVisible().catch(() => false)),
      "Order packet end screen is not on this staging deploy yet. Hub should re-walk after this PR is on regi-staging.",
    );

    await expect(utahOrderPacket(page)).toContainText("Your order packet");
    await expect(utahOrderPacket(page)).toContainText("REGI01");
    await expect(page.getByText("Get to payment")).toBeVisible();
    await expect(utahOpenOrderPlates(page)).toHaveAttribute(
      "href",
      "https://mvp.tax.utah.gov/?Link=OrderPlates",
    );
    await expect(page.getByText(/does not prefill MVP or skip payment/i)).toBeVisible();

    const garageExit = platesBackToGarage(page);
    test.skip(
      !(await garageExit.isVisible().catch(() => false)),
      "Back to garage end-screen exit is not on this staging deploy yet. Hub should re-walk after this PR is on regi-staging.",
    );
    await expect(garageExit).toHaveAttribute("href", "/garage");
    await garageExit.click();
    await expect(page).toHaveURL(/\/garage\/?$/);
  });
});
