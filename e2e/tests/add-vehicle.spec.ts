import { test, expect } from "@playwright/test";

test.describe("Add Vehicle Flow", () => {
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
          body: JSON.stringify({ registrations: [] }),
        });
      } else if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            registration: {
              id: "new-reg-123",
              type: body.type || "passenger",
              vin: body.vin,
              plate: body.plate,
              state: body.state || "UT",
              year: body.year || 2021,
              make: body.make || "Honda",
              model: body.model || "Accord",
              bodyClass: body.bodyClass || "Sedan",
              nickname: body.nickname,
              photoUrl: null,
              photos: [],
              registrationExpiresOn: body.registrationExpiresOn || "2025-12-31",
              status: "Current",
              countdown: "Expires in 300 days",
              details: {},
              canEdit: true,
              households: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.continue();
      }
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
                {
                  type: "motorcycle",
                  label: "Motorcycle",
                  pluralLabel: "Motorcycles",
                  identityFields: ["vin", "plate", "yearMakeModel"],
                  decode: "nhtsa_vin",
                  notes: null,
                },
                {
                  type: "trailer",
                  label: "Trailer",
                  pluralLabel: "Trailers",
                  identityFields: ["vin", "plate", "yearMakeModel"],
                  decode: "none",
                  notes: null,
                },
              ],
            },
          ],
        }),
      });
    });

    await page.route("**/api/vin/decode", async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          vin: body.vin,
          year: 2021,
          make: "Honda",
          model: "Accord",
          bodyClass: "Sedan",
          registrationType: "passenger",
        }),
      });
    });

    await page.route("**/api/documents**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ documents: [] }),
      });
    });
  });

  test("shows empty garage state with add registration button", async ({
    page,
  }) => {
    await page.goto("/garage");
    await expect(page.getByText("Add your first registration")).toBeVisible();
    await expect(
      page.getByTestId("add-first-registration-button")
    ).toBeVisible();
  });

  test("navigates to add vehicle flow when clicking add button", async ({
    page,
  }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await expect(page.getByText("Add a registration")).toBeVisible();
    await expect(
      page.getByText("Scan your registration, enter your VIN, or add manually")
    ).toBeVisible();
  });

  test("shows VIN lookup form", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await expect(page.getByTestId("vin-lookup-form")).toBeVisible();
    await expect(page.getByTestId("vin-input")).toBeVisible();
    await expect(page.getByTestId("vin-lookup-submit")).toBeVisible();
  });

  test("validates VIN format before lookup", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await page.getByTestId("vin-input").fill("INVALID");
    await page.getByTestId("vin-lookup-submit").click();

    await expect(
      page.getByText("Enter a 17-character VIN")
    ).toBeVisible();
  });

  test("looks up VIN and shows vehicle confirmation", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await page.getByTestId("vin-input").fill("1HGCM82633A123456");
    await page.getByTestId("vin-lookup-submit").click();

    await expect(page.getByText("2021 Honda Accord")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("confirm-vehicle-button")).toBeVisible();
  });

  test("can navigate to manual add flow", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await page.getByTestId("add-manually-button").click();

    await expect(page.getByTestId("type-picker-grid")).toBeVisible();
  });

  test("shows type picker with available vehicle types", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();
    await page.getByTestId("add-manually-button").click();

    await expect(page.getByTestId("type-picker-passenger")).toBeVisible();
    await expect(page.getByTestId("type-picker-motorcycle")).toBeVisible();
    await expect(page.getByTestId("type-picker-trailer")).toBeVisible();
  });

  test("completes add vehicle flow via VIN lookup", async ({ page }) => {
    await page.goto("/garage");
    await page.getByTestId("add-first-registration-button").click();

    await page.getByTestId("vin-input").fill("1HGCM82633A123456");
    await page.getByTestId("vin-lookup-submit").click();

    await expect(page.getByTestId("confirm-vehicle-button")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("confirm-vehicle-button").click();

    await expect(page.getByTestId("save-registration-button")).toBeVisible({
      timeout: 10000,
    });

    await page.getByLabel("Nickname").fill("Family Car");
    await page.getByTestId("save-registration-button").click();

    await expect(page.getByText("Family Car")).toBeVisible({ timeout: 10000 });
  });
});
