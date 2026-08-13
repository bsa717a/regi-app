const OEM_HOST_PATTERNS = [
  /owners\.(honda|acura)\.com/i,
  /owner\.(ford|lincoln)\.com/i,
  /my\.(gm|chevrolet|buick|gmc|cadillac)\.com/i,
  /owners\.(toyota|lexus)\.com/i,
  /owners\.(nissan|infiniti)\.com/i,
  /owners\.(hyundai|genesis)\.com/i,
  /owners\.kia\.com/i,
  /owners\.(subaru|mazda|volkswagen|audi|bmw|mercedes-benz|stellantis)\.com/i,
  /rivian\.com/i,
  /assets\.rivian\.com/i,
  /tesla\.com/i,
  /lucidmotors\.com/i,
  /polestar\.com/i,
];

const PAID_PROVIDER_HOST_PATTERNS = [
  /vhr\.nyc3\.cdn\.digitaloceanspaces\.com/i,
];

const BLOCKED_HOST_PATTERNS = [
  /(^|\.)google\./i,
  /(^|\.)youtube\./i,
  /(^|\.)reddit\./i,
  /(^|\.)facebook\./i,
  /(^|\.)wikipedia\./i,
  /(^|\.)amazon\./i,
  /(^|\.)ebay\./i,
];

const MANUAL_PATH_HINTS =
  /(\.pdf($|\?|#)|owner|manual|guide|owners-guide|support\/article|support-documents|og-en|owners_guide)/i;

export type ManualUrlContext = {
  make?: string | null;
  model?: string | null;
};

function parseHttpsUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" || !parsed.hostname) return null;
    if (raw.toLowerCase().includes("javascript:")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function matchesHostPatterns(raw: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(raw));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hostnameMatchesMake(hostname: string, make: string | null | undefined): boolean {
  if (!make?.trim()) return false;
  const slug = normalizeToken(make);
  if (slug.length < 3) return false;
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host.includes(slug);
}

function looksLikeManualPath(pathAndQuery: string): boolean {
  return MANUAL_PATH_HINTS.test(pathAndQuery);
}

/** Official OEM owner-manual links from free lookup. */
export function isValidFreeManualUrl(
  raw: string,
  context?: ManualUrlContext,
): boolean {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  if (matchesHostPatterns(parsed.hostname, BLOCKED_HOST_PATTERNS)) return false;
  if (matchesHostPatterns(raw, OEM_HOST_PATTERNS)) return true;

  const path = `${parsed.pathname}${parsed.search}`;

  if (context?.make && hostnameMatchesMake(parsed.hostname, context.make)) {
    return looksLikeManualPath(path);
  }

  return false;
}

/** Links returned by the paid provider (OEM or known CDN path). */
export function isValidPaidProviderManualUrl(raw: string): boolean {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  if (matchesHostPatterns(raw, OEM_HOST_PATTERNS)) return true;
  if (!matchesHostPatterns(raw, PAID_PROVIDER_HOST_PATTERNS)) return false;
  return /owners-manual/i.test(parsed.pathname);
}

export function readManualUrl(
  value: unknown,
  context?: ManualUrlContext,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidFreeManualUrl(trimmed, context) ? trimmed : null;
}

export function readPaidProviderManualUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidPaidProviderManualUrl(trimmed) ? trimmed : null;
}
