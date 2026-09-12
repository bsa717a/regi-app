/** Default Playwright target — durable staging Cloud Run. Never production. */
export const STAGING_ORIGIN =
  "https://regi-staging-90502049802.us-central1.run.app";

const PRODUCTION_HOSTS = new Set([
  "app.regireg.com",
  "www.regireg.com",
  "regireg.com",
  "regi-90502049802.us-central1.run.app",
  "regi-app-v1.web.app",
  "regi-app-v1.firebaseapp.com",
]);

export class ProductionE2eTargetError extends Error {
  constructor(hostname: string) {
    super(
      `E2E refused production host "${hostname}". Set PLAYWRIGHT_BASE_URL to ${STAGING_ORIGIN} (or localhost). Never point Playwright at production.`,
    );
    this.name = "ProductionE2eTargetError";
  }
}

export function isLocalPlaywrightHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function isProductionPlaywrightHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (PRODUCTION_HOSTS.has(host)) return true;
  if (host.endsWith(".regireg.com") && host !== "staging.regireg.com") {
    return true;
  }
  return false;
}

/** Resolve PLAYWRIGHT_BASE_URL (default: staging). Throws if the host is production. */
export function resolvePlaywrightBaseURL(
  raw = process.env.PLAYWRIGHT_BASE_URL,
): string {
  const value = raw?.trim() || STAGING_ORIGIN;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `PLAYWRIGHT_BASE_URL is not a valid URL: ${value}. Use ${STAGING_ORIGIN}`,
    );
  }
  if (isProductionPlaywrightHost(parsed.hostname)) {
    throw new ProductionE2eTargetError(parsed.hostname);
  }
  return parsed.origin;
}
