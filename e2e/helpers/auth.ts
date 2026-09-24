import { expect, type Page } from "@playwright/test";
import {
  allowSignupFallback,
  demoEmail,
  demoPassword,
  missingPasswordMessage,
} from "../env";
import {
  addAnotherRegistration,
  addFirstRegistration,
  addVehicle,
  loginEmail,
  loginError,
  loginForm,
  loginPassword,
  loginSubmit,
  signupAgree,
  signupEmail,
  signupForm,
  signupName,
  signupPassword,
  signupPhone,
  signupSubmit,
} from "./selectors";

export async function expectGarage(page: Page) {
  await expect(page).toHaveURL(/\/garage/, { timeout: 45_000 });
  await expect(page.getByRole("heading", { name: "Garage", exact: true })).toBeVisible({
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
  await expect(loginForm(page)).toBeVisible({ timeout: 45_000 });
  await loginEmail(page).fill(email);
  await loginPassword(page).fill(password);
  await loginSubmit(page).click();

  const error = loginError(page);
  const garageHeading = page.getByRole("heading", { name: "Garage", exact: true });

  await Promise.race([
    garageHeading.waitFor({ state: "visible", timeout: 45_000 }),
    error.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {
    /* fall through */
  });

  if (await garageHeading.isVisible().catch(() => false)) {
    await expectGarage(page);
    return;
  }

  if ((await error.isVisible().catch(() => false)) && allowSignupFallback()) {
    await createDemoApplicant(page, email, password);
    return;
  }

  const errorText = (await error.textContent().catch(() => null)) ?? "";
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
  await expect(signupForm(page)).toBeVisible({ timeout: 30_000 });
  await signupName(page).fill("Demo Applicant");
  await signupEmail(page).fill(email);
  await signupPhone(page).fill("8015550100");
  await signupPassword(page).fill(password);
  await signupAgree(page).check();
  await signupSubmit(page).click();
  await expectGarage(page);
}

export async function openAddRegistration(page: Page) {
  // AppShell title "Garage" is visible while the list is still loading, so
  // wait out the skeleton before looking for empty/non-empty CTAs.
  await page
    .getByLabel("Loading registrations")
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => {
      /* already settled */
    });

  const first = addFirstRegistration(page);
  const add = addVehicle(page);
  const another = addAnotherRegistration(page);
  const anyAdd = first.or(add).or(another);

  await expect(anyAdd.first()).toBeVisible({ timeout: 20_000 });

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
