import { test, expect } from "@playwright/test";

const mockRegistration = {
  id: "reg-test-001",
  type: "passenger",
  vin: "1HGCM82633A123456",
  plate: "TEST123",
  state: "UT",
  year: 2021,
  make: "Honda",
  model: "Accord",
  bodyClass: "Sedan",
  nickname: "Family Car",
  photoUrl: null,
  photos: [],
  registrationExpiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0],
  status: "Due Soon" as const,
  countdown: "Expires in 30 days",
  details: {},
  canEdit: true,
  households: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockRenewal = {
  id: "renewal-test-001",
  registrationId: mockRegistration.id,
  registration: mockRegistration,
  status: "Requested" as const,
  workflow: "owner_driven",
  needsCounty: false,
  countyOptions: [],
  requiredDocuments: [
    {
      type: "registration",
      label: "Current Registration",
      notes: "Photo or scan of your current registration card",
      uploaded: false,
    },
  ],
  missingDocumentTypes: ["registration"],
  documentsComplete: false,
  feeBreakdown: {
    baseFee: 4400,
    county: null,
    lateFee: 0,
    inspectionFee: 0,
    lateInspectionFee: 0,
    serviceFee: 1500,
    total: 5900,
    currency: "USD",
  },
  timestamps: {
    requestedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe("Renewal Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user-123",
            email: "test@example.com",
            name: "Test User",
            emailVerified: true,
            role: "user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notificationPrefs: { email: true, push: false, sms: false },
          },
        }),
      });
    });

    await page.route("**/api/registrations", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ registrations: [mockRegistration] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/registrations/*", async (route) => {
      const url = route.request().url();
      if (url.includes(mockRegistration.id) && route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ registration: mockRegistration }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/renewals", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ renewal: mockRenewal, resumed: false }),
        });
      } else if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ renewals: [mockRenewal] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/renewals/*", async (route) => {
      const url = route.request().url();
      if (url.includes(mockRenewal.id)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ renewal: mockRenewal }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ documents: [] }),
      });
    });

    await page.route("**/api/states", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          states: [
            {
              code: "UT",
              name: "Utah",
              dueSoonThresholdDays: 60,
              registrationTypes: [
                {
                  type: "passenger",
                  label: "Passenger vehicle",
                  pluralLabel: "Passenger vehicles",
                  identityFields: ["vin", "plate", "yearMakeModel"],
                  decode: "nhtsa_vin",
                  notes: null,
                },
              ],
            },
          ],
        }),
      });
    });
  });

  test("shows vehicle in garage with renewal option when due soon", async ({
    page,
  }) => {
    await page.goto("/garage");

    await expect(page.getByText("Family Car")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Due Soon")).toBeVisible();

    const vehicleItem = page.getByTestId(`vehicle-item-${mockRegistration.id}`);
    await vehicleItem.click();

    await expect(
      page.getByTestId(`renew-vehicle-${mockRegistration.id}`)
    ).toBeVisible({ timeout: 5000 });
  });

  test("starts renewal flow from garage", async ({ page }) => {
    await page.goto("/garage");

    const vehicleItem = page.getByTestId(`vehicle-item-${mockRegistration.id}`);
    await vehicleItem.click();

    const renewLink = page.getByTestId(`renew-vehicle-${mockRegistration.id}`);
    await renewLink.click();

    await expect(page).toHaveURL(/\/renewals\//, { timeout: 10000 });
  });

  test("shows renewal page with required documents", async ({ page }) => {
    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByText("Renew Family Car")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Required documents")).toBeVisible();
    await expect(page.getByText("Current Registration")).toBeVisible();
    await expect(page.getByText("Needed")).toBeVisible();
  });

  test("shows document upload button", async ({ page }) => {
    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByTestId("upload-doc-registration")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows fee estimate on renewal page", async ({ page }) => {
    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByText("Fee estimate")).toBeVisible({ timeout: 10000 });
  });

  test("submit button is disabled when documents are incomplete", async ({
    page,
  }) => {
    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByTestId("submit-renewal-button")).toBeDisabled({
      timeout: 10000,
    });
  });

  test("shows blocking reasons when not ready to submit", async ({ page }) => {
    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(
      page.getByText("Complete these items to submit:")
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Missing.*Registration.*document/i)
    ).toBeVisible();
  });
});
