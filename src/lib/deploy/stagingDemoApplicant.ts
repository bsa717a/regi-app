/**
 * Priority 2 hook: seed a real Firebase applicant onto a non-prod database.
 * Both env vars must be set together. Never run seed against prod DATABASE_URL.
 */
export const STAGING_DEMO_APPLICANT_EMAIL_ENV = "STAGING_DEMO_APPLICANT_EMAIL";
export const STAGING_DEMO_APPLICANT_UID_ENV =
  "STAGING_DEMO_APPLICANT_FIREBASE_UID";

export type StagingDemoApplicant = {
  email: string;
  firebaseUid: string;
};

export function resolveStagingDemoApplicant(
  env: NodeJS.ProcessEnv = process.env,
): StagingDemoApplicant | null {
  const email = env[STAGING_DEMO_APPLICANT_EMAIL_ENV]?.trim() ?? "";
  const firebaseUid = env[STAGING_DEMO_APPLICANT_UID_ENV]?.trim() ?? "";

  if (!email && !firebaseUid) return null;
  if (!email || !firebaseUid) {
    throw new Error(
      `${STAGING_DEMO_APPLICANT_EMAIL_ENV} and ${STAGING_DEMO_APPLICANT_UID_ENV} must be set together`,
    );
  }
  if (!email.includes("@")) {
    throw new Error(`${STAGING_DEMO_APPLICANT_EMAIL_ENV} must be an email`);
  }
  return { email, firebaseUid };
}
