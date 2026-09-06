import { test, expect } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays login form", async ({ page }) => {
    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toHaveText("Open garage");
  });

  test("shows validation when submitting empty form", async ({ page }) => {
    await page.getByTestId("login-submit").click();
    const emailInput = page.getByTestId("login-email");
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: 400,
            message: "INVALID_LOGIN_CREDENTIALS",
            errors: [{ reason: "invalid" }],
          },
        }),
      });
    });

    await page.getByTestId("login-email").fill("invalid@example.com");
    await page.getByTestId("login-password").fill("wrongpassword");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible({ timeout: 10000 });
  });

  test("has link to signup page", async ({ page }) => {
    const signupLink = page.getByRole("link", { name: "Create account" });
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveAttribute("href", "/signup");
  });

  test("has link to forgot password page", async ({ page }) => {
    const forgotLink = page.getByRole("link", { name: "Forgot password?" });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  test("disables form while submitting", async ({ page }) => {
    await page.route("**/identitytoolkit.googleapis.com/**", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "TIMEOUT" } }),
      });
    });

    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-password").fill("password123");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-submit")).toBeDisabled();
    await expect(page.getByTestId("login-email")).toBeDisabled();
  });
});
