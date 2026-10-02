/**
 * Licenses we may download, crop, and keep as our own garage asset.
 * CC BY-SA stays share-alike: cropping does not relicense the file.
 * NC and ND are refused (ND forbids the crop; NC is not in the allow-list).
 */
export type FreeLicense = {
  name: string;
  url: string | null;
  shareAlike: boolean;
};

function strip(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function versionOf(match: string | undefined): string {
  if (!match) return "4.0";
  return match.startsWith("1") || match.startsWith("2") || match.startsWith("3") || match.startsWith("4")
    ? match
    : "4.0";
}

/**
 * Accept CC BY, CC BY-SA, CC0, and public domain only.
 * Returns null for anything else, including missing metadata.
 */
export function parseFreeLicense(
  shortName: string | null | undefined,
  licenseUrl?: string | null,
): FreeLicense | null {
  const raw = strip(shortName ?? "");
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (
    /non-?commercial|\bnc\b|no ?deriv|\bnoderiv/.test(lower) ||
    /\bnd\b/.test(lower)
  ) {
    return null;
  }

  if (/public domain|\bpd\b|cc0|cc zero|pd-self|pd-us/.test(lower)) {
    const name = /cc0|cc zero/.test(lower) ? "CC0" : "Public domain";
    return {
      name,
      url:
        licenseUrl?.trim() ||
        (name === "CC0"
          ? "https://creativecommons.org/publicdomain/zero/1.0/"
          : null),
      shareAlike: false,
    };
  }

  const shareAlike =
    /cc[\s-]*by[\s-]*sa\b/.test(lower) ||
    (/creative commons/.test(lower) && /share[\s-]?alike/.test(lower));
  const attribution =
    shareAlike ||
    /cc[\s-]*by\b/.test(lower) ||
    (/creative commons/.test(lower) && /attribution/.test(lower));

  if (!attribution) return null;

  const version = versionOf(
    (lower.match(/\b([1-4](?:\.\d)?)\b/) ?? [])[1],
  );

  if (shareAlike) {
    return {
      name: `CC BY-SA ${version}`,
      url:
        licenseUrl?.trim() ||
        `https://creativecommons.org/licenses/by-sa/${version}/`,
      shareAlike: true,
    };
  }

  return {
    name: `CC BY ${version}`,
    url:
      licenseUrl?.trim() ||
      `https://creativecommons.org/licenses/by/${version}/`,
    shareAlike: false,
  };
}

export function plainText(value: string | null | undefined, max = 240): string {
  const text = strip(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
  return text.slice(0, max);
}
