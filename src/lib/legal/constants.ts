export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";

/** Displayed on the public legal pages. Update when the copy changes. */
export const LEGAL_LAST_UPDATED = "August 12, 2026";

export function legalContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || "support@regi.app"
  );
}
