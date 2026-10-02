import { textMentionsModel } from "@/lib/registrations/vehicleCatalog/identity";
import {
  fileTitle,
  selectFilePhoto,
  selectGenerationPhoto,
  type RemoteFile,
  type SelectedPhoto,
  type WikiPage,
} from "@/lib/registrations/vehicleCatalog/select";
import type { CatalogQuery } from "@/lib/registrations/vehicleCatalog/select";

const USER_AGENT = "RegiApp/1.0 (https://app.regireg.com; vehicle-catalog)";
const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const MAX_JSON_CHARS = 2_000_000;

export type CatalogFetch = (
  input: URL,
  init: RequestInit,
) => Promise<Response>;

function allowedApi(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    (url.hostname === "en.wikipedia.org" || url.hostname === "commons.wikimedia.org") &&
    url.pathname === "/w/api.php"
  );
}

export function allowedImageDownload(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "upload.wikimedia.org" ||
        parsed.hostname === "thumb.wikimedia.org")
    );
  } catch {
    return false;
  }
}

async function apiGet(
  fetchImpl: CatalogFetch,
  base: string,
  params: Record<string, string>,
): Promise<unknown> {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (!allowedApi(url)) {
    throw new Error("Refusing vehicle-catalog request to an unexpected host");
  }
  const response = await fetchImpl(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Wikimedia request failed (${response.status})`);
  }
  const text = await response.text();
  if (text.length > MAX_JSON_CHARS) {
    throw new Error("Wikimedia response was too large");
  }
  return JSON.parse(text) as unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pageList(payload: unknown): Record<string, unknown>[] {
  const query = asRecord(asRecord(payload)?.query);
  const pages = query?.pages;
  if (!pages || typeof pages !== "object") return [];
  return Object.values(pages as Record<string, unknown>).filter(
    (page): page is Record<string, unknown> => Boolean(page && typeof page === "object"),
  );
}

function revisionText(page: Record<string, unknown>): string {
  const revisions = page.revisions;
  if (!Array.isArray(revisions) || !revisions[0] || typeof revisions[0] !== "object") {
    return "";
  }
  const revision = revisions[0] as Record<string, unknown>;
  const slots = asRecord(revision.slots);
  const main = slots ? asRecord(slots.main) : null;
  const fromSlot = main?.["*"] ?? main?.content;
  if (typeof fromSlot === "string") return fromSlot;
  return typeof revision["*"] === "string" ? revision["*"] : "";
}

function metaValue(info: Record<string, unknown>, key: string): string {
  const ext = asRecord(info.extmetadata);
  const row = ext ? asRecord(ext[key]) : null;
  return typeof row?.value === "string" ? row.value : "";
}

function toRemoteFile(page: Record<string, unknown>): RemoteFile | null {
  const title = typeof page.title === "string" ? page.title : "";
  const infos = page.imageinfo;
  if (!title || !Array.isArray(infos) || !infos[0] || typeof infos[0] !== "object") {
    return null;
  }
  const info = infos[0] as Record<string, unknown>;
  const url = typeof info.url === "string" ? info.url : "";
  if (!url) return null;
  return {
    title,
    mime: typeof info.mime === "string" ? info.mime : "",
    width: Number(info.width) || 0,
    height: Number(info.height) || 0,
    url,
    thumbUrl: typeof info.thumburl === "string" ? info.thumburl : null,
    licenseShortName: metaValue(info, "LicenseShortName"),
    licenseUrl: metaValue(info, "LicenseUrl"),
    artistHtml: metaValue(info, "Artist"),
    descriptionHtml: metaValue(info, "ImageDescription"),
    pageUrl: typeof info.descriptionurl === "string" ? info.descriptionurl : "",
  };
}

function leadImageNames(page: WikiPage): string[] {
  const names: string[] = [];
  if (page.imageName) names.push(page.imageName);
  const imageField = page.wikitext.match(/\|\s*image\s*=\s*([^|\n<]+)/i)?.[1];
  if (imageField) names.push(imageField.replace(/^File:/i, "").trim());
  return names;
}

function fileNamesOnPages(pages: WikiPage[], query: CatalogQuery): string[] {
  const relevant = pages.filter(
    (page) =>
      textMentionsModel(page.title, query.model) ||
      textMentionsModel(page.imageName ?? "", query.model),
  );
  const source = relevant.length > 0 ? relevant : pages;
  const leads: string[] = [];
  const profiles: string[] = [];
  const rest: string[] = [];
  for (const page of source) leads.push(...leadImageNames(page));
  for (const page of source) {
    for (const match of page.wikitext.matchAll(/\[\[(?:File|Image):([^|\]]+)/gi)) {
      const name = match[1]?.trim();
      if (!name) continue;
      if (/\b(profile|side)\b/i.test(name)) profiles.push(name);
      else rest.push(name);
    }
  }
  const names = new Set<string>();
  for (const name of [...leads, ...profiles, ...rest]) {
    names.add(name);
    if (names.size >= 12) break;
  }
  return [...names];
}

async function fetchFiles(
  fetchImpl: CatalogFetch,
  names: string[],
): Promise<RemoteFile[]> {
  if (names.length === 0) return [];
  const payload = await apiGet(fetchImpl, COMMONS, {
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1400",
    titles: names.map((name) => fileTitle(name)).join("|"),
  });
  return pageList(payload)
    .map(toRemoteFile)
    .filter((file): file is RemoteFile => file !== null);
}

async function stockAlternative(
  query: CatalogQuery,
  fetchImpl: CatalogFetch,
): Promise<SelectedPhoto | null> {
  const titles = await searchTitles(
    fetchImpl,
    COMMONS,
    `${query.year} ${query.make} ${query.model}`,
    "6",
  );
  const files = await fetchFiles(fetchImpl, titles);
  const selected = selectFilePhoto(query, files);
  if (!selected || /racing|race bike/i.test(selected.sourceTitle)) return null;
  return allowedImageDownload(selected.downloadUrl) ? selected : null;
}

async function searchTitles(
  fetchImpl: CatalogFetch,
  base: string,
  search: string,
  namespace?: string,
): Promise<string[]> {
  const params: Record<string, string> = {
    action: "query",
    format: "json",
    list: "search",
    srsearch: search,
    srlimit: "6",
  };
  if (namespace) params.srnamespace = namespace;
  const payload = await apiGet(fetchImpl, base, params);
  const searchRows = asRecord(asRecord(payload)?.query)?.search;
  if (!Array.isArray(searchRows)) return [];
  return searchRows
    .map((row) => (asRecord(row)?.title as string | undefined) ?? "")
    .filter(Boolean);
}

async function fetchPages(fetchImpl: CatalogFetch, titles: string[]): Promise<WikiPage[]> {
  if (titles.length === 0) return [];
  const payload = await apiGet(fetchImpl, WIKIPEDIA, {
    action: "query",
    format: "json",
    prop: "revisions|pageimages",
    rvprop: "content",
    rvslots: "main",
    piprop: "name",
    titles: titles.slice(0, 6).join("|"),
  });
  return pageList(payload)
    .filter((page) => page.missing !== "")
    .map((page) => ({
      title: typeof page.title === "string" ? page.title : "",
      wikitext: revisionText(page),
      imageName: typeof page.pageimage === "string" ? page.pageimage : null,
    }))
    .filter((page) => page.title && page.wikitext);
}

/**
 * Resolve a year / make / model to one Commons photo of that generation.
 * Network stays inside this function so tests can pass a fake fetch.
 */
export async function findLicensedVehiclePhoto(
  query: CatalogQuery,
  fetchImpl: CatalogFetch = (input, init) => fetch(input, init),
  nowYear = new Date().getUTCFullYear(),
): Promise<SelectedPhoto | null> {
  const search = `${query.year} ${query.make} ${query.model}`.slice(0, 180);
  const titles = await searchTitles(fetchImpl, WIKIPEDIA, search);
  const pages = await fetchPages(fetchImpl, titles);
  const pageFiles = await fetchFiles(fetchImpl, fileNamesOnPages(pages, query));
  const fromGeneration = selectGenerationPhoto(query, pages, pageFiles, nowYear);
  if (fromGeneration && allowedImageDownload(fromGeneration.downloadUrl)) {
    if (!/racing|race bike/i.test(fromGeneration.sourceTitle)) return fromGeneration;
    const stock = await stockAlternative(query, fetchImpl);
    if (stock) return stock;
    return fromGeneration;
  }

  const fileTitles = await searchTitles(fetchImpl, COMMONS, search, "6");
  const looseFiles = await fetchFiles(fetchImpl, fileTitles);
  const fromFile = selectFilePhoto(query, looseFiles);
  if (fromFile && allowedImageDownload(fromFile.downloadUrl)) return fromFile;
  return null;
}
