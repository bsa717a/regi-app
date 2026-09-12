import { expect, type Page } from "@playwright/test";
import {
  allowSignupFallback,
  demoEmail,
  demoPassword,
  missingPasswordMessage,
} from "../env";

export async function expectGarage(page: Page) {
  await expect(page).toHaveURL(/\/garage/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Garage" })).toBeVisible({
    timeout: 30_000,
  });
}

export async function signInDemoApplicant(page: Page) {
  const password = demoPassword();
  if (!password) {
    throw new Error(missingPasswordMessage());
  }
  const email = demoEmail();

  await page.goto("/login");
  await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 45_000 });
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  const loginError = page.getByTestId("login-error");
  const garageHeading = page.getByRole("heading", { name: "Garage" });

  await Promise.race([
    garageHeading.waitFor({ state: "visible", timeout: 45_000 }),
    loginError.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {
    /* fall through to URL / signup checks */
  });

  if (await garageHeading.isVisible().catch(() => false)) {
    await expectGarage(page);
    return;
  }

  if ((await loginError.isVisible().catch(() => false)) && allowSignupFallback()) {
    await createDemoApplicant(page, email, password);
    return;
  }

  const errorText = (await loginError.textContent().catch(() => null)) ?? "";
  throw new Error(
    [
      "Demo applicant login failed.",
      errorText ? `UI: ${errorText.trim()}` : "No login error rendered (timeout?).",
      "Prefer the already-verified staging account.",
      "Set REGI_STAGING_ALLOW_SIGNUP=1 only if you intentionally want signup fallback.",
      missingPasswordMessage(),
    ].join(" "),
  );
}

async function createDemoApplicant(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await expect(page.getByTestId("signup-form")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("signup-name").fill("Demo Applicant");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-phone").fill("8015550100");
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-agree").check();
  await page.getByTestId("signup-submit").click();
  await expectGarage(page);
}

export async function openAddRegistration(page: Page) {
  const first = page.getByTestId("add-first-registration-button");
  const add = page.getByTestId("add-vehicle-button");
  const another = page.getByTestId("add-another-registration-button");

  if (await first.isVisible().catch(() => false)) {
    await first.click();
  } else if (await add.isVisible().catch(() => false)) {
    await add.click();
  } else if (await another.isVisible().catch(() => false)) {
    await another.click();
  } else {
    throw new Error("Could not find an Add registration control on /garage");
  }

  await expect(page.getByRole("heading", { name: "Add a registration" })).toBeVisible({
    timeout: 15_000,
  });
}
