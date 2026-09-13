import type { Metadata } from "next";

/** Browser / PWA brand. Used as the default document title and suffix. */
export const APP_NAME = "REGI";

/** Visible separator in titles like `Garage · REGI`. */
export const TITLE_SEPARATOR = " · ";

/** Next.js `title.template` for child routes that set a short segment. */
export const DOCUMENT_TITLE_TEMPLATE = `%s${TITLE_SEPARATOR}${APP_NAME}`;

/**
 * Full document title. Empty / brand-only labels stay `REGI`.
 * Already-suffixed strings are left alone so callers can pass either form.
 */
export function pageTitle(segment: string): string {
  const label = segment.trim();
  if (!label || label === APP_NAME) {
    return APP_NAME;
  }
  const suffix = `${TITLE_SEPARATOR}${APP_NAME}`;
  if (label.endsWith(suffix)) {
    return label;
  }
  return `${label}${suffix}`;
}

/**
 * Static `metadata` for a route. Uses `title.absolute` so a root
 * `title.template` cannot double-suffix (`Garage · REGI · REGI`).
 */
export function pageMetadata(
  segment: string,
  extras: Omit<Metadata, "title"> = {},
): Metadata {
  return {
    title: { absolute: pageTitle(segment) },
    ...extras,
  };
}
