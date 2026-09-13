import type { Page } from "@playwright/test";

/**
 * Prefer data-testids (this PR / #58). Fall back to labels/roles that
 * already exist on currently deployed staging so the suite can run
 * before this branch is deployed to regi-staging.
 */
export function loginForm(page: Page) {
  return page.getByTestId("login-form").or(page.locator("form").filter({ has: page.getByLabel("Email") }));
}

export function loginEmail(page: Page) {
  return page.getByTestId("login-email").or(page.getByLabel("Email", { exact: true }));
}

export function loginPassword(page: Page) {
  return page.getByTestId("login-password").or(page.getByLabel("Password", { exact: true }));
}

export function loginSubmit(page: Page) {
  return page
    .getByTestId("login-submit")
    .or(page.getByRole("button", { name: /Open garage|Checking keys|Opening/ }));
}

export function loginError(page: Page) {
  return page.getByTestId("login-error").or(page.getByRole("alert"));
}

export function signupForm(page: Page) {
  return page.getByTestId("signup-form").or(page.locator("form").filter({ has: page.getByLabel("Name") }));
}

export function signupName(page: Page) {
  return page.getByTestId("signup-name").or(page.getByLabel("Name", { exact: true }));
}

export function signupEmail(page: Page) {
  return page.getByTestId("signup-email").or(page.getByLabel("Email", { exact: true }));
}

export function signupPhone(page: Page) {
  return page.getByTestId("signup-phone").or(page.getByLabel("Phone", { exact: true }));
}

export function signupPassword(page: Page) {
  return page.getByTestId("signup-password").or(page.getByLabel("Password", { exact: true }));
}

export function signupAgree(page: Page) {
  return page.getByTestId("signup-agree").or(page.locator("#signup-agree"));
}

export function signupSubmit(page: Page) {
  return page
    .getByTestId("signup-submit")
    .or(page.getByRole("button", { name: /Create account|Creating account/ }));
}

/** Bottom-nav tab — not CTAs like "Go to garage". */
export function navGarage(page: Page) {
  return page.getByRole("link", { name: "Garage", exact: true });
}

export function navDocuments(page: Page) {
  return page.getByRole("link", { name: "Documents", exact: true });
}

export function navSettings(page: Page) {
  return page.getByRole("link", { name: "Settings", exact: true });
}

export function navRenewals(page: Page) {
  return page.getByRole("link", { name: "Renewals", exact: true });
}

export function addFirstRegistration(page: Page) {
  // Live staging empty garage: card CTA "Add a registration"
  // (testid may be absent until this branch is deployed).
  return page
    .getByTestId("add-first-registration-button")
    .or(page.getByRole("button", { name: /^Add a registration$/i }))
    .or(page.getByRole("button", { name: /Add a registration/i }))
    .or(page.locator("button").filter({ hasText: /^Add a registration$/i }));
}

export function addVehicle(page: Page) {
  return page
    .getByTestId("add-vehicle-button")
    .or(page.getByRole("button", { name: "Add", exact: true }));
}

export function addAnotherRegistration(page: Page) {
  return page
    .getByTestId("add-another-registration-button")
    .or(page.getByRole("button", { name: /^Add another registration$/i }))
    .or(page.locator("button").filter({ hasText: /^Add another registration$/i }));
}

/** Unique plates-step fieldset label — not body copy or the stepper. */
export function plateTypeLegend(page: Page) {
  return page
    .getByRole("legend", { name: "Plate type" })
    .or(page.locator("legend").filter({ hasText: /^Plate type$/ }));
}

export function vinInput(page: Page) {
  return page.getByTestId("vin-input").or(page.locator("#pick-type-vin"));
}

export function vinLookupSubmit(page: Page) {
  return page
    .getByTestId("vin-lookup-submit")
    .or(page.getByRole("button", { name: /Look up VIN|Looking up VIN/ }));
}

export function addManually(page: Page) {
  return page.getByTestId("add-manually-button").or(page.getByRole("button", { name: "Or add manually" }));
}

export function typePickerGrid(page: Page) {
  return page
    .getByTestId("type-picker-grid")
    .or(page.getByRole("button", { name: /Passenger vehicle/i }).locator("xpath=ancestor::div[contains(@class,'grid')][1]"));
}

export function typePickerPassenger(page: Page) {
  return page
    .getByTestId("type-picker-passenger")
    .or(page.getByRole("button", { name: /Passenger vehicle/i }));
}

export function confirmVehicle(page: Page) {
  return page
    .getByTestId("confirm-vehicle-button")
    .or(page.getByRole("button", { name: /Yes, that's mine/i }));
}

export function applicantProfileForm(page: Page) {
  return page
    .getByTestId("applicant-profile-form")
    .or(page.locator("form").filter({ has: page.getByLabel("Name") }));
}

export function applicantName(page: Page) {
  return page.getByTestId("applicant-name").or(page.locator("#settings-name"));
}

export function saveProfile(page: Page) {
  return page
    .getByTestId("save-profile-button")
    .or(page.getByRole("button", { name: /Save profile|Saving/ }));
}

export function plateTypePicker(page: Page) {
  return page.getByTestId("plate-type-picker").or(page.getByRole("group", { name: "Plate type" }));
}

export function platesContinue(page: Page) {
  return page
    .getByTestId("plates-continue")
    .or(page.getByRole("button", { name: /Continue|See MVP summary/ }));
}

export function utahOrderPacket(page: Page) {
  return page.getByTestId("utah-order-packet");
}

export function utahOpenOrderPlates(page: Page) {
  return page
    .getByTestId("utah-open-order-plates")
    .or(page.getByRole("link", { name: /Open Order Plates/i }));
}

export function plateType(page: Page, optionId: string, label: string) {
  return page
    .getByTestId(`utah-plate-type-${optionId}`)
    .or(page.locator("label").filter({ hasText: label }).first());
}

export function submitRenewal(page: Page) {
  return page
    .getByTestId("submit-renewal-button")
    .or(page.getByRole("button", { name: /Submit renewal|Submitting/ }));
}

export function submitBlockingReasons(page: Page) {
  return page
    .getByTestId("submit-blocking-reasons")
    .or(page.getByText("Complete these items to submit:"));
}

export function feeEstimate(page: Page) {
  return page.getByTestId("fee-estimate").or(page.getByRole("heading", { name: "Fee estimate" }));
}

export function paymentNotRequired(page: Page) {
  return page
    .getByTestId("payment-not-required")
    .or(page.getByText(/No payment required during MVP/i));
}

export function documentPreviewModal(page: Page) {
  return page.getByTestId("document-preview-modal").or(page.getByRole("dialog"));
}

export function renewNow(page: Page) {
  return page.getByTestId("renew-now-button").or(page.getByRole("button", { name: "Renew Now" }));
}

export function vehicleItems(page: Page) {
  return page.locator("[data-testid^='vehicle-item-']").or(page.locator("ul.space-y-4 > li"));
}
