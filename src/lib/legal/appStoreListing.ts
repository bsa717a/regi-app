import {
  PRIVACY_PATH,
  PRODUCTION_ORIGIN,
  SUPPORT_PATH,
  TERMS_PATH,
  legalContactEmail,
  productionUrl,
} from "@/lib/legal/constants";
import { APP_STORE_PRIVACY_NUTRITION_LABELS } from "@/lib/legal/appStorePrivacyLabels";

/**
 * Copy-paste values for App Store Connect (Phase 5).
 * Filling these in Connect does not submit the app for review.
 */

export const APP_STORE_LISTING = {
  bundleId: "app.regi.ios",
  sku: "regi-ios",
  primaryLanguage: "English (U.S.)",
  name: "REGI",
  subtitle: "Never miss a registration",
  primaryCategory: "Lifestyle",
  secondaryCategory: "Productivity",
  version: "1.0",
  copyright: "© 2026 REGI",
  privacyPolicyUrl: productionUrl(PRIVACY_PATH),
  supportUrl: productionUrl(SUPPORT_PATH),
  marketingUrl: PRODUCTION_ORIGIN,
  supportEmail: legalContactEmail(),
  keywords:
    "registration,vehicle,renewal,reminder,expiration,garage,DMV,sticker,car,VIN,insurance",
  promotionalText:
    "Keep every vehicle registration in one garage. Reminders before stickers expire — Face ID, push, and camera on iPhone.",
  description: `REGI keeps every vehicle registration in one garage so you never miss an expiration.

Add cars, motorcycles, trailers, boats, and off-highway vehicles. Store registration cards, insurance, titles, and receipts. Get reminders before stickers expire. Share a household garage with a spouse or partner.

Native features on iPhone:
• Face ID or Touch ID to unlock REGI
• Push notifications for renewal and maintenance reminders
• Camera capture for registration cards and receipts
• Branded offline screen when you have no connection

REGI is not a government agency or DMV. You remain responsible for deadlines and filings. The app does not charge for registrations or subscriptions.

Account deletion: Settings → Delete account.`,
  whatsNew: "First iPhone release of REGI.",
} as const;

export const APP_STORE_AGE_RATING = {
  expectedRating: "4+",
  answers: {
    "Cartoon or Fantasy Violence": "None",
    "Realistic Violence": "None",
    "Prolonged Graphic or Sadistic Realistic Violence": "None",
    "Profanity or Crude Humor": "None",
    "Mature or Suggestive Themes": "None",
    "Horror or Fear Themes": "None",
    "Medical or Treatment Information": "None",
    "Alcohol, Tobacco, or Drug Use or References": "None",
    "Simulated Gambling": "None",
    "Sexual Content or Nudity": "None",
    "Graphic Sexual Content and Nudity": "None",
    "Guns or Other Weapons": "None",
    "Unrestricted Web Access": "No",
    "Gambling": "No",
    "Contests": "No",
    "User-Generated Content": "No",
    "Advertising": "No",
  },
  notes:
    "Users store their own private vehicle documents. Content is not a public feed. Household sharing is invite-only. The in-app WebView loads REGI only, not the open web.",
} as const;

export const APP_STORE_COMPLIANCE = {
  exportEncryption: {
    usesEncryption: true,
    exemptBecauseHttpsOnly: true,
    infoPlistKey: "ITSAppUsesNonExemptEncryption = false",
    connectAnswer:
      "Yes, the app uses encryption, limited to HTTPS / TLS provided by the OS. It qualifies for the standard exemption (no custom crypto).",
  },
  advertisingIdentifier: "No. Do not include the Advertising Identifier.",
  contentRights:
    "Users upload their own registration materials. REGI does not scrape DMV sites in the client.",
} as const;

export const APP_STORE_REVIEW_NOTES = `REGI manages vehicle registrations and renewal reminders.

Native features (Guideline 4.2):
• Native APNs push notifications for renewal and maintenance reminders
• Face ID / Touch ID to unlock the app (Settings → Security)
• Camera / photo library to capture registration cards and receipts
• Content loads from our HTTPS backend; airplane mode shows a branded local offline screen (not a blank WebView)

This is not a thin website wrapper. There is no Safari chrome.

Account deletion: Settings → Delete account (type DELETE to confirm).

Push: optional. Enable in Settings to test notifications.

Payments: the app does not charge for digital goods or registrations.

Demo login is in App Review Information (email + password). The demo garage is pre-populated so you do not need to create an account or verify email.

Privacy: ${productionUrl(PRIVACY_PATH)}
Terms: ${productionUrl(TERMS_PATH)}
Support: ${productionUrl(SUPPORT_PATH)}`;

export const APP_STORE_SCREENSHOTS = {
  iphoneRequired: "6.9-inch (portrait 1320×2868, 1290×2796, or 1260×2736)",
  ipad: "Not required — first release is iPhone only (TARGETED_DEVICE_FAMILY = 1).",
  captureOn: "Physical iPhone or Simulator via the Capacitor app. No Safari chrome.",
  shots: [
    "Garage with at least two vehicles and upcoming expirations",
    "A registration detail with documents or photos",
    "Renewals list (no payment / checkout UI)",
    "Settings → Security showing Face ID unlock",
    "Document or receipt capture (camera or photo picker context)",
  ],
} as const;

export const APP_STORE_DEMO_ACCOUNT = {
  setup: [
    "Create a Firebase Auth user with a real mailbox you control (e.g. review@…). Verify the email.",
    "Sign in once on production so /api/me creates the Postgres user and household.",
    "Add 2–3 vehicles with expirations, at least one document or photo, and a renewal if the UI needs it.",
    "Paste email + password only into App Store Connect → App Review Information. Do not commit the password.",
  ],
  seedNote:
    "prisma/seed.ts demo@regi.app is local-only and is not a production Firebase user.",
} as const;

export const APP_STORE_PRIVACY_LABELS = APP_STORE_PRIVACY_NUTRITION_LABELS;
