/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, type Page } from "@playwright/test";

type RegistrationStatus = "Current" | "Due Soon" | "Expired";
type RenewalStatus = "Requested" | "Documents Received" | "In Review" | "Processing" | "Completed" | "Cancelled";

type RegistrationDto = {
  id: string;
  type: string;
  vin: string | null;
  plate: string | null;
  state: string;
  year: number | null;
  make: string | null;
  model: string | null;
  bodyClass: string | null;
  nickname: string | null;
  photoUrl: string | null;
  photos: Array<{ id: string; url: string }>;
  registrationExpiresOn: string;
  status: RegistrationStatus;
  countdown: string;
  details: Record<string, unknown>;
  canEdit: boolean;
  households: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
};

type RequiredDocumentStatus = {
  type: string;
  label: string;
  notes: string | null;
  uploaded: boolean;
};

type RenewalDto = {
  id: string;
  registrationId: string;
  registration: RegistrationDto;
  status: RenewalStatus;
  workflow: string;
  needsCounty: boolean;
  countyOptions: string[];
  requiredDocuments: RequiredDocumentStatus[];
  missingDocumentTypes: string[];
  documentsComplete: boolean;
  feeBreakdown: {
    baseFee: number;
    county: string | null;
    lateFee: number;
    inspectionFee: number;
    lateInspectionFee: number;
    serviceFee: number;
    total: number;
    currency: string;
  };
  timestamps: {
    requestedAt: string;
    submittedAt?: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};

type DocumentDto = {
  id: string;
  registrationId: string;
  type: string;
  originalFilename: string;
  contentType: string;
  sizeByte: number;
  createdAt: string;
  updatedAt: string;
};

type AuthUserProfile = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  addressState: string | null;
  postalCode: string | null;
  notificationPrefs: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
};

export type MockUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  idToken: string;
};

export type MockData = {
  user: MockUser;
  profile: AuthUserProfile;
  registrations: RegistrationDto[];
  renewals: RenewalDto[];
  documents: DocumentDto[];
};

type TestFixtures = {
  mockData: MockData;
  setupApiMocks: (data?: Partial<MockData>) => Promise<void>;
  authenticateUser: () => Promise<void>;
};

export const mockUser: MockUser = {
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  emailVerified: true,
  idToken: "mock-firebase-id-token-for-testing",
};

export const mockProfile: AuthUserProfile = {
  id: mockUser.id,
  email: mockUser.email,
  name: mockUser.name,
  phone: null,
  role: "user",
  emailVerified: mockUser.emailVerified,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  addressLine1: null,
  addressLine2: null,
  city: null,
  addressState: null,
  postalCode: null,
  notificationPrefs: {
    email: true,
    push: false,
    sms: false,
  },
};

export const mockRegistration: RegistrationDto = {
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
  status: "Due Soon",
  countdown: "Expires in 30 days",
  details: {},
  canEdit: true,
  households: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockRenewal: RenewalDto = {
  id: "renewal-test-001",
  registrationId: mockRegistration.id,
  registration: mockRegistration,
  status: "Requested",
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

export const mockDocument: DocumentDto = {
  id: "doc-test-001",
  registrationId: mockRegistration.id,
  type: "registration",
  originalFilename: "registration-card.jpg",
  contentType: "image/jpeg",
  sizeByte: 150000,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultMockData: MockData = {
  user: mockUser,
  profile: mockProfile,
  registrations: [],
  renewals: [],
  documents: [],
};

export const test = base.extend<TestFixtures>({
  mockData: [defaultMockData, { option: true }],

  setupApiMocks: async ({ page, mockData }, use) => {
    const setup = async (overrides?: Partial<MockData>) => {
      const data = { ...mockData, ...overrides };

      await page.route("**/api/me", async (route) => {
        if (route.request().method() === "GET" || route.request().method() === "POST") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ user: data.profile }),
          });
        } else if (route.request().method() === "PATCH") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ user: data.profile }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/registrations", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ registrations: data.registrations }),
          });
        } else if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          const newReg: RegistrationDto = {
            ...mockRegistration,
            id: `reg-${Date.now()}`,
            ...body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          data.registrations.push(newReg);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ registration: newReg }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/registrations/*", async (route) => {
        const url = route.request().url();
        const idMatch = url.match(/\/api\/registrations\/([^/]+)/);
        const regId = idMatch?.[1];

        if (route.request().method() === "GET") {
          const reg = data.registrations.find((r) => r.id === regId);
          if (reg) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ registration: reg }),
            });
          } else {
            await route.fulfill({ status: 404 });
          }
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/renewals", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ renewals: data.renewals }),
          });
        } else if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          const reg = data.registrations.find(
            (r) => r.id === body.registrationId
          );
          const newRenewal: RenewalDto = {
            ...mockRenewal,
            id: `renewal-${Date.now()}`,
            registrationId: body.registrationId,
            registration: reg || mockRegistration,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          data.renewals.push(newRenewal);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ renewal: newRenewal, resumed: false }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/renewals/*", async (route) => {
        const url = route.request().url();
        const idMatch = url.match(/\/api\/renewals\/([^/]+)/);
        const renewalId = idMatch?.[1];

        if (route.request().method() === "GET") {
          const renewal = data.renewals.find((r) => r.id === renewalId);
          if (renewal) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ renewal }),
            });
          } else {
            await route.fulfill({ status: 404 });
          }
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/documents**", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ documents: data.documents }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/documents/upload-url", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            uploadUrl: "https://storage.example.com/mock-upload-url",
            gcsPath: "mock/path/to/document.pdf",
            requiredHeaders: { "Content-Type": "application/pdf" },
          }),
        });
      });

      await page.route("**/api/vin/decode", async (route) => {
        const body = route.request().postDataJSON();
        const vin = body?.vin || "1HGCM82633A123456";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            vin,
            year: 2021,
            make: "Honda",
            model: "Accord",
            bodyClass: "Sedan",
            registrationType: "passenger",
          }),
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

      await page.route("https://storage.example.com/**", async (route) => {
        await route.fulfill({ status: 200 });
      });
    };

    await use(setup);
  },

  authenticateUser: async ({ page, mockData }, use) => {
    const authenticate = async () => {
      await page.evaluate(
        ({ user, profile }) => {
          localStorage.setItem(
            "e2e_mock_auth",
            JSON.stringify({
              user: {
                uid: user.id,
                email: user.email,
                displayName: user.name,
                emailVerified: user.emailVerified,
              },
              idToken: user.idToken,
              profile,
            })
          );
        },
        { user: mockData.user, profile: mockData.profile }
      );
    };

    await use(authenticate);
  },
});

export { expect } from "@playwright/test";

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function fillLoginForm(
  page: Page,
  email: string,
  password: string
) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
}

export async function clickButton(page: Page, name: string) {
  await page.getByRole("button", { name }).click();
}
