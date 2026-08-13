const OEM_HOST_PATTERNS = [
  /owners\.(honda|acura)\.com/i,
  /owner\.(ford|lincoln)\.com/i,
  /my\.(gm|chevrolet|buick|gmc|cadillac)\.com/i,
  /owners\.(toyota|lexus)\.com/i,
  /owners\.(nissan|infiniti)\.com/i,
  /owners\.(hyundai|genesis)\.com/i,
  /owners\.kia\.com/i,
  /owners\.(subaru|mazda|volkswagen|audi|bmw|mercedes-benz|stellantis)\.com/i,
];

const PAID_PROVIDER_HOST_PATTERNS = [
  /vhr\.nyc3\.cdn\.digitaloceanspaces\.com/i,
];

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

function matchesHostPatterns(hostname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(hostname));
}

/** Official OEM owner-manual links from free lookup. */
export function isValidFreeManualUrl(raw: string): boolean {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  return matchesHostPatterns(parsed.hostname, OEM_HOST_PATTERNS);
}

/** Links returned by the paid provider (OEM or known CDN path). */
export function isValidPaidProviderManualUrl(raw: string): boolean {
  const parsed = parseHttpsUrl(raw);
  if (!parsed) return false;
  if (matchesHostPatterns(parsed.hostname, OEM_HOST_PATTERNS)) return true;
  if (!matchesHostPatterns(parsed.hostname, PAID_PROVIDER_HOST_PATTERNS)) return false;
  return /owners-manual/i.test(parsed.pathname);
}

export function readManualUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidFreeManualUrl(trimmed) ? trimmed : null;
}

export function readPaidProviderManualUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isValidPaidProviderManualUrl(trimmed) ? trimmed : null;
}
