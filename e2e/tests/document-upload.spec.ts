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

const mockRenewalWithUploadedDoc = {
  ...mockRenewal,
  requiredDocuments: [
    {
      type: "registration",
      label: "Current Registration",
      notes: "Photo or scan of your current registration card",
      uploaded: true,
    },
  ],
  missingDocumentTypes: [],
  documentsComplete: true,
};

test.describe("Document Upload Flow", () => {
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ registrations: [mockRegistration] }),
      });
    });

    await page.route("**/api/registrations/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ registration: mockRegistration }),
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

  test("shows upload form in renewal flow", async ({ page }) => {
    const renewalState = { ...mockRenewal };

    await page.route("**/api/renewals/**", async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === "GET" && url.includes(mockRenewal.id)) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ renewal: renewalState }),
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

    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByTestId("upload-doc-registration")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Choose file")).toBeVisible();
    await expect(page.getByText("Take photo")).toBeVisible();
  });

  test("shows progress indicator during upload", async ({ page }) => {
    await page.route("**/api/renewals/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ renewal: mockRenewal }),
      });
    });

    await page.route("**/api/documents/upload-url", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://storage.example.com/mock-upload",
          gcsPath: "mock/path/to/document.pdf",
          requiredHeaders: { "Content-Type": "application/pdf" },
        }),
      });
    });

    await page.route("https://storage.example.com/**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ status: 200 });
    });

    await page.route("**/api/documents", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            document: {
              id: "doc-123",
              registrationId: mockRegistration.id,
              type: "registration",
              originalFilename: "test.pdf",
              contentType: "application/pdf",
              sizeByte: 1000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ documents: [] }),
        });
      }
    });

    await page.goto(`/renewals/${mockRenewal.id}`);

    const fileInput = page.getByTestId("upload-doc-input-registration");
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    await fileInput.setInputFiles({
      name: "test-registration.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Mock PDF content for testing"),
    });

    await expect(page.getByText("Uploading")).toBeVisible({ timeout: 5000 });
  });

  test("shows uploaded status after successful upload", async ({ page }) => {
    await page.route("**/api/renewals/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ renewal: mockRenewalWithUploadedDoc }),
      });
    });

    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          documents: [
            {
              id: "doc-123",
              registrationId: mockRegistration.id,
              type: "registration",
              originalFilename: "registration-card.jpg",
              contentType: "image/jpeg",
              sizeByte: 150000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByText("Uploaded")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("All set")).toBeVisible();
  });

  test("enables submit button when all documents are uploaded", async ({
    page,
  }) => {
    await page.route("**/api/renewals/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ renewal: mockRenewalWithUploadedDoc }),
      });
    });

    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ documents: [] }),
      });
    });

    await page.goto(`/renewals/${mockRenewal.id}`);

    await expect(page.getByTestId("submit-renewal-button")).toBeEnabled({
      timeout: 10000,
    });
  });

  test("shows documents page with upload option", async ({ page }) => {
    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ documents: [] }),
      });
    });

    await page.goto("/documents");

    await expect(page.getByRole("button", { name: "Upload" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows upload sheet when clicking upload button on documents page", async ({
    page,
  }) => {
    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ documents: [] }),
      });
    });

    await page.goto("/documents");

    await page.getByRole("button", { name: "Upload" }).click();

    await expect(page.getByText("Document vault")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Document type")).toBeVisible();
    await expect(page.getByText("Choose file")).toBeVisible();
  });
});
