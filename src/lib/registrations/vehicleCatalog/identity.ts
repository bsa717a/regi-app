const TRIM_WORDS = new Set([
  "xlt",
  "lariat",
  "limited",
  "sport",
  "ex",
  "lx",
  "se",
  "le",
  "dx",
  "touring",
  "hybrid",
  "adventure",
  "crew",
  "base",
  "premium",
  "platinum",
  "laramie",
  "tradesman",
  "express",
  "rebel",
  "slt",
  "denali",
  "lt",
  "ls",
  "rs",
  "sr",
  "sv",
  "awd",
  "4wd",
  "4x4",
  "fwd",
  "rwd",
  "supercrew",
  "supercab",
  "regular",
]);

const MAKE_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  chevy: "chevrolet",
  chev: "chevrolet",
  mercedes: "mercedesbenz",
  mercedesbenz: "mercedesbenz",
  harleydavidson: "harleydavidson",
  hd: "harleydavidson",
};

/** Manufacturers we must not substitute for one another. */
export const MANUFACTURER_TOKENS = [
  "honda",
  "toyota",
  "ford",
  "chevrolet",
  "gmc",
  "ram",
  "dodge",
  "tesla",
  "nissan",
  "bmw",
  "audi",
  "hyundai",
  "kia",
  "subaru",
  "mazda",
  "volkswagen",
  "jeep",
  "lexus",
  "acura",
  "infiniti",
  "mercedesbenz",
  "porsche",
  "rivian",
  "volvo",
  "buick",
  "cadillac",
  "chrysler",
  "lincoln",
  "mitsubishi",
  "fiat",
  "harley",
  "harleydavidson",
  "yamaha",
  "kawasaki",
  "suzuki",
  "ducati",
] as const;

export function normalizeVehicleToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function canonicalMake(make: string): string {
  const token = normalizeVehicleToken(make);
  return MAKE_ALIASES[token] ?? token;
}

export function acceptedMakeTokens(make: string): string[] {
  const key = canonicalMake(make);
  if (key === "ram") return ["ram", "dodge"];
  if (key === "chevrolet") return ["chevrolet", "chevy"];
  if (key === "volkswagen") return ["volkswagen", "vw"];
  if (key === "harleydavidson") return ["harleydavidson", "harley"];
  return [key];
}

/** Stable model key. Trim words drop off so "F-150 XLT" matches "F-150". */
export function modelKey(model: string): string {
  const words = model
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const kept = words.filter((word) => !TRIM_WORDS.has(word));
  return normalizeVehicleToken((kept.length ? kept : words).join(" "));
}

export function cacheIdentity(make: string, model: string): {
  makeKey: string;
  modelKey: string;
} | null {
  const makeKey = canonicalMake(make);
  const key = modelKey(model);
  if (!makeKey || !key) return null;
  return { makeKey, modelKey: key };
}

export function textMentionsMake(text: string, make: string): boolean {
  const normalized = normalizeVehicleToken(text);
  return acceptedMakeTokens(make).some((token) => normalized.includes(token));
}

export function textMentionsModel(text: string, model: string): boolean {
  const key = modelKey(model);
  if (!key) return false;
  return normalizeVehicleToken(text).includes(key);
}

/**
 * True when a filename names a different manufacturer than the one we asked for.
 * Dodge is allowed on a Ram lookup because Ram trucks were Dodge Rams.
 */
export function filenameConflicts(filename: string, make: string): boolean {
  const normalized = normalizeVehicleToken(filename);
  const ours = new Set(acceptedMakeTokens(make));
  if (canonicalMake(make) === "ram") ours.add("ram");
  for (const other of MANUFACTURER_TOKENS) {
    if (ours.has(other)) continue;
    if (other === "harley" && ours.has("harleydavidson")) continue;
    if (normalized.includes(other)) return true;
  }
  return false;
}

const DETAIL_SHOT =
  /\b(interior|engine|dashboard|logo|emblem|badge|steering|swingarm|exhaust|sensor|diagram|icon|drawing|sketch|cockpit|odometer|gauge|seat|brake|pdf)\b/i;

export function isDetailShot(filename: string): boolean {
  return DETAIL_SHOT.test(filename.replace(/[_-]+/g, " "));
}

export function isRasterMime(mime: string): boolean {
  const value = mime.toLowerCase();
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}
