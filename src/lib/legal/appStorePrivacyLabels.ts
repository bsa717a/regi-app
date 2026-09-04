/**
 * App Store Connect → App Privacy (Nutrition Labels) for REGI iOS.
 * Enter these values in Phase 5. Keep in sync with /privacy.
 *
 * Tracking: No. We do not use data for tracking across apps/websites.
 * Linked to identity: Yes for account-backed data.
 */

export type PrivacyPurpose = "App Functionality";

export type PrivacyDataType = {
  type: string;
  linkedToIdentity: boolean;
  usedForTracking: boolean;
  purposes: PrivacyPurpose[];
  notes: string;
};

export type PrivacyCategory = {
  category: string;
  types: PrivacyDataType[];
};

export const APP_STORE_PRIVACY_NUTRITION_LABELS: PrivacyCategory[] = [
  {
    category: "Contact Info",
    types: [
      {
        type: "Name",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Account profile and household display name.",
      },
      {
        type: "Email Address",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Firebase Auth sign-in, household invites, optional email reminders (Resend).",
      },
      {
        type: "Phone Number",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Optional profile field. SMS reminders are not enabled yet.",
      },
    ],
  },
  {
    category: "User Content",
    types: [
      {
        type: "Photos or Videos",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Registration cards, receipts, and vehicle photos stored in private GCS.",
      },
      {
        type: "Other User Content",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Vehicle/registration records, documents, maintenance logs, in-app assistant chat.",
      },
    ],
  },
  {
    category: "Identifiers",
    types: [
      {
        type: "User ID",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "Firebase Auth UID and REGI user id.",
      },
      {
        type: "Device ID",
        linkedToIdentity: true,
        usedForTracking: false,
        purposes: ["App Functionality"],
        notes: "FCM / APNs push tokens when the user enables notifications.",
      },
    ],
  },
];
