import {
  resolvePlaywrightBaseURL,
  STAGING_ORIGIN,
} from "../src/lib/e2e/stagingTarget";

export { STAGING_ORIGIN };

/** Demo applicant already verified in regi-app-staging Firebase. */
export const DEFAULT_STAGING_DEMO_EMAIL = "demo.applicant+staging@regireg.com";

/** GCP Secret Manager secret that holds the demo password (value never committed). */
export const STAGING_DEMO_PASSWORD_SECRET = "regi-staging-demo-applicant";

export function playwrightBaseURL(): string {
  return resolvePlaywrightBaseURL();
}

export function demoEmail(): string {
  return (
    process.env.REGI_STAGING_DEMO_EMAIL?.trim() ||
    process.env.PLAYWRIGHT_EMAIL?.trim() ||
    process.env.E2E_TEST_EMAIL?.trim() ||
    DEFAULT_STAGING_DEMO_EMAIL
  );
}

export function demoPassword(): string | undefined {
  const value =
    process.env.REGI_STAGING_DEMO_PASSWORD?.trim() ||
    process.env.PLAYWRIGHT_PASSWORD?.trim() ||
    process.env.E2E_TEST_PASSWORD?.trim();
  return value || undefined;
}

export function allowSignupFallback(): boolean {
  return process.env.REGI_STAGING_ALLOW_SIGNUP === "1";
}

export function hasDemoPassword(): boolean {
  return Boolean(demoPassword());
}

export function missingPasswordMessage(): string {
  return [
    "REGI_STAGING_DEMO_PASSWORD is not set.",
    `Hub/CI: inject the value of Secret Manager secret ${STAGING_DEMO_PASSWORD_SECRET}`,
    "(project regi-app-v1) as REGI_STAGING_DEMO_PASSWORD or PLAYWRIGHT_PASSWORD.",
    "Do not hardcode the password. Do not target production.",
  ].join(" ");
}
