const OEM_DOMAIN_SUFFIXES = [
  "owners.honda.com",
  "owners.acura.com",
  "owner.ford.com",
  "owner.lincoln.com",
  "my.gm.com",
  "my.chevrolet.com",
  "my.buick.com",
  "my.gmc.com",
  "my.cadillac.com",
  "owners.toyota.com",
  "owners.lexus.com",
  "owners.nissan.com",
  "owners.infiniti.com",
  "owners.hyundai.com",
  "owners.genesis.com",
  "owners.kia.com",
  "owners.subaru.com",
  "owners.mazda.com",
  "owners.volkswagen.com",
  "owners.audi.com",
  "owners.bmw.com",
  "owners.mercedes-benz.com",
  "owners.stellantis.com",
  "rivian.com",
  "assets.rivian.com",
  "tesla.com",
  "lucidmotors.com",
  "polestar.com",
  "harley-davidson.com",
  "yamaha-motor.com",
  "polaris.com",
  "brp.com",
  "ski-doo.com",
  "sea-doo.com",
  "can-am.com",
  "winnebago.com",
  "forestriverinc.com",
  "jayco.com",
  "thorindustries.com",
  "fleetwoodrv.com",
  "newmar.com",
  "tiffinmotorhomes.com",
  "mercurymarine.com",
  "bostonwhaler.com",
  "mastercraft.com",
  "indianmotorcycle.com",
  "ktm.com",
  "kawasaki.com",
  "suzuki.com",
  "ducati.com",
  "triumphmotorcycles.com",
];

const PAID_PROVIDER_DOMAIN_SUFFIXES = ["vhr.nyc3.cdn.digitaloceanspaces.com"];

const BLOCKED_DOMAIN_SUFFIXES = [
  "google.com",
  "youtube.com",
  "reddit.com",
  "facebook.com",
  "wikipedia.org",
  "amazon.com",
  "ebay.com",
  "pinterest.com",
];

const MANUAL_PATH_HINTS =
  /(\.pdf($|\?|#)|owner|manual|guide|handbook|operators|operator|literature|documentation|support\/article|support-documents|owners-guide|og-en|owners_guide|service-manual|rv-manual|snowmobile|motorcycle|motorhome|boat|trailer|download)/i;

/** Map normalized make tokens to common manufacturer domain fragments. */
const MAKE_HOST_ALIASES: Record<string, string[]> = {
  harleydavidson: ["harleydavidson"],
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

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function hostMatchesDomainSuffix(hostname: string, domainSuffix: string): boolean {
  const host = normalizeHostname(hostname);
  return host === domainSuffix || host.endsWith(`.${domainSuffix}`);
}

function matchesAnyDomainSuffix(hostname: string, suffixes: string[]): boolean {
  return suffixes.some((suffix) => hostMatchesDomainSuffix(hostname, suffix));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function makeHostTokens(make: string): string[] {
  const tokens = new Set<string>();
  const compact = normalizeToken(make);
  if (compact.length >= 3) tokens.add(compact);

  for (const alias of MAKE_HOST_ALIASES[compact] ?? []) {
    if (alias.length >= 3) tokens.add(alias);
  }

  return [...tokens].filter((token) => token.length >= 3);
}

function hostnameLabels(hostname: string): string[] {
  return normalizeHostname(hostname).split(".").filter(Boolean);
}

function registrableDomainLabel(hostname: string): string | null {
  const labels = hostnameLabels(hostname);
  if (labels.length < 2) return labels[0] ?? null;
  return normalizeToken(labels[labels.length - 2] ?? "");
}

function hostnameMatchesMake(hostname: string, make: string | null | undefined): boolean {
  if (!make?.trim()) return false;

  const registrable = registrableDomainLabel(hostname);
  if (registrable === null) return false;

  const tokens = makeHostTokens(make);

  return tokens.some((token) => registrable === token);
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
  if (matchesAnyDomainSuffix(parsed.hostname, BLOCKED_DOMAIN_SUFFIXES)) return false;
  if (matchesAnyDomainSuffix(parsed.hostname, OEM_DOMAIN_SUFFIXES)) return true;

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
  if (matchesAnyDomainSuffix(parsed.hostname, OEM_DOMAIN_SUFFIXES)) return true;
  if (!matchesAnyDomainSuffix(parsed.hostname, PAID_PROVIDER_DOMAIN_SUFFIXES)) {
    return false;
  }
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
