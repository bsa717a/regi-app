export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const SUPPORT_PATH = "/support";

/** Displayed on the public legal pages. Update when the copy changes. */
export const LEGAL_LAST_UPDATED = "September 4, 2026";

/** Canonical production origin for App Store Connect URLs. */
export const PRODUCTION_ORIGIN = "https://app.regireg.com";

/** Previous Cloud Run URL — keep allowed for existing email / invite links. */
export const LEGACY_PRODUCTION_ORIGIN =
  "https://regi-90502049802.us-central1.run.app";

export function legalContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || "support@regi.app"
  );
}

export function productionUrl(path: string): string {
  return `${PRODUCTION_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}
