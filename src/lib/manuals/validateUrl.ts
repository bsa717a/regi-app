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
  /harley-davidson\.com/i,
  /yamaha-motor\.com/i,
  /yamaha-motor\.(com|eu)/i,
  /polaris\.com/i,
  /brp\.com/i,
  /ski-doo\.com/i,
  /sea-doo\.com/i,
  /can-am\.com/i,
  /winnebago\.com/i,
  /forestriverinc\.com/i,
  /jayco\.com/i,
  /thorindustries\.com/i,
  /fleetwoodrv\.com/i,
  /newmar\.com/i,
  /tiffinmotorhomes\.com/i,
  /mercurymarine\.com/i,
  /bostonwhaler\.com/i,
  /mastercraft\.com/i,
  /indianmotorcycle\.com/i,
  /ktm\.com/i,
  /kawasaki\.com/i,
  /suzuki\.com/i,
  /ducati\.com/i,
  /triumphmotorcycles\.com/i,
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
  /(^|\.)pinterest\./i,
];

const MANUAL_PATH_HINTS =
  /(\.pdf($|\?|#)|owner|manual|guide|handbook|operators|operator|literature|documentation|support\/article|support-documents|owners-guide|og-en|owners_guide|service-manual|rv-manual|snowmobile|motorcycle|motorhome|boat|trailer|download)/i;

/** Map normalized make tokens to common manufacturer domain fragments. */
const MAKE_HOST_ALIASES: Record<string, string[]> = {
  harleydavidson: ["harley"],
  harley: ["harleydavidson"],
  indian: ["indianmotorcycle"],
  indianmotorcycle: ["indian"],
  arcticcat: ["arcticcat"],
  skidoo: ["skidoo", "brp"],
  seadoo: ["seadoo", "brp"],
  canam: ["canam", "brp"],
  mercury: ["mercurymarine"],
  mercurymarine: ["mercury"],
  forestriver: ["forestriverinc"],
  bostonwhaler: ["bostonwhaler"],
};

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

function makeHostTokens(make: string): string[] {
  const tokens = new Set<string>();
  const compact = normalizeToken(make);
  if (compact.length >= 3) tokens.add(compact);

  for (const part of make.toLowerCase().split(/[^a-z0-9]+/)) {
    if (part.length >= 3) tokens.add(part);
  }

  for (const token of [...tokens]) {
    for (const alias of MAKE_HOST_ALIASES[token] ?? []) {
      if (alias.length >= 3) tokens.add(alias);
    }
  }

  return [...tokens].filter((token) => token.length >= 3);
}

function hostnameMatchesMake(hostname: string, make: string | null | undefined): boolean {
  if (!make?.trim()) return false;
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return makeHostTokens(make).some((token) => host.includes(token));
}

function looksLikeManualPath(pathAndQuery: string): boolean {
  return MANUAL_PATH_HINTS.test(pathAndQuery);
}

function isPdfPath(pathAndQuery: string): boolean {
  return /\.pdf($|\?|#)/i.test(pathAndQuery);
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
    if (isPdfPath(path)) return true;
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
