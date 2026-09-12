import { expect, test } from "@playwright/test";
import { STAGING_ORIGIN } from "../env";
import {
  isProductionPlaywrightHost,
  resolvePlaywrightBaseURL,
} from "../../src/lib/e2e/stagingTarget";

test.describe("Staging public smoke (no demo password)", () => {
  test("refuses to treat production as the Playwright target", () => {
    const origin = resolvePlaywrightBaseURL();
    expect(isProductionPlaywrightHost(new URL(origin).hostname)).toBe(false);
    expect(origin).not.toMatch(/app\.regireg\.com/);
    expect(origin).not.toBe("https://regi-90502049802.us-central1.run.app");
  });

  test("health reports isolated staging, not prod", async ({ request, baseURL }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      ok?: boolean;
      service?: string;
      environment?: string;
      firebaseProjectId?: string;
    };
    expect(body.ok).toBe(true);

    if (baseURL?.startsWith(STAGING_ORIGIN)) {
      expect(body.service).toBe("regi-staging");
      expect(body.environment).toBe("staging");
      expect(body.firebaseProjectId).toBe("regi-app-staging");
    } else {
      expect(body.ok).toBe(true);
    }
  });

  test("login form is reachable with #58 testids", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toHaveText("Open garage");
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup",
    );
    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  test("empty login submit uses native required validation", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-submit").click();
    const invalid = await page
      .getByTestId("login-email")
      .evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(invalid).toBe(true);
  });
});
