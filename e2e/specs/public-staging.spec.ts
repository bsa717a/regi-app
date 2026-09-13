import { expect, test } from "@playwright/test";
import { STAGING_ORIGIN } from "../env";
import {
  loginEmail,
  loginError,
  loginForgotPassword,
  loginForm,
  loginPassword,
  loginSubmit,
} from "../helpers/selectors";
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

  test("login form is reachable", async ({ page }) => {
    await page.goto("/login");
    await expect(loginForm(page)).toBeVisible({ timeout: 45_000 });
    await expect(loginEmail(page)).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(loginSubmit(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Open garage" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/signup",
    );
    const forgot = loginForgotPassword(page);
    await expect(forgot).toBeVisible();
    await expect(forgot).toHaveAttribute("href", "/forgot-password");
  });

  test("forgot-password page is reachable from login", async ({ page }) => {
    await page.goto("/login");
    await expect(loginForgotPassword(page)).toBeVisible({ timeout: 45_000 });
    await loginForgotPassword(page).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("failed login shows an inline error and keeps Forgot password visible", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(loginForm(page)).toBeVisible({ timeout: 45_000 });
    await loginEmail(page).fill("nobody@example.invalid");
    await loginPassword(page).fill("definitely-not-the-password");
    await loginSubmit(page).click();
    await expect(loginError(page)).toBeVisible({ timeout: 20_000 });
    await expect(loginError(page)).toHaveText(
      /incorrect|doesn.t match|does not match|no regi account|could not sign in/i,
    );
    await expect(loginForgotPassword(page)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("empty login submit stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(loginSubmit(page)).toBeVisible({ timeout: 45_000 });
    const email = page.locator("#email");
    await expect(email).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("required", "");
    await loginSubmit(page).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Open the garage" })).toBeVisible();
  });
});
