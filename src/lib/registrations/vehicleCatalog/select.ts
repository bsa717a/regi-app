import {
  filenameConflicts,
  isDetailShot,
  isRasterMime,
  modelKey,
  textMentionsMake,
  textMentionsModel,
} from "@/lib/registrations/vehicleCatalog/identity";
import {
  parseFreeLicense,
  plainText,
  type FreeLicense,
} from "@/lib/registrations/vehicleCatalog/license";

export type CatalogQuery = {
  year: number;
  make: string;
  model: string;
};

export type WikiPage = {
  title: string;
  wikitext: string;
  imageName: string | null;
};

export type RemoteFile = {
  title: string;
  mime: string;
  width: number;
  height: number;
  url: string;
  thumbUrl: string | null;
  licenseShortName: string;
  licenseUrl: string;
  artistHtml: string;
  descriptionHtml: string;
  pageUrl: string;
};

export type SelectedPhoto = {
  yearFrom: number;
  yearTo: number;
  generationLabel: string;
  downloadUrl: string;
  sourceUrl: string;
  sourceTitle: string;
  author: string;
  license: FreeLicense;
};

const MAX_GENERATION_SPAN = 12;

export function extractTemplate(wikitext: string, name: string): string | null {
  const start = wikitext.search(new RegExp(`\\{\\{\\s*${name}\\b`, "i"));
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < wikitext.length - 1; i++) {
    const pair = wikitext.slice(i, i + 2);
    if (pair === "{{") {
      depth += 1;
      i += 1;
      continue;
    }
    if (pair === "}}") {
      depth -= 1;
      i += 1;
      if (depth === 0) return wikitext.slice(start, i + 1);
    }
  }
  return null;
}

function templateField(template: string, field: string): string | null {
  const match = template.match(
    new RegExp(`\\|\\s*${field}\\s*=\\s*([\\s\\S]*?)(?=\\n\\||\\n\\}\\})`, "i"),
  );
  return match?.[1]?.trim() ?? null;
}

export function parseYearSpan(
  value: string | null | undefined,
  nowYear: number,
): { yearFrom: number; yearTo: number } | null {
  if (!value) return null;
  const text = value.replace(/<br\s*\/?>/gi, " ").replace(/\{\{[^}]*\}\}/g, " ");
  const match = text.match(/(\d{4})\s*[–—-]\s*(\d{4}|present|current)/i);
  if (!match) {
    const one = text.match(/\b(19|20)\d{2}\b/);
    if (!one) return null;
    const year = Number(one[0]);
    return { yearFrom: year, yearTo: year };
  }
  const yearFrom = Number(match[1]);
  const open = /present|current/i.test(match[2]);
  const yearTo = open ? Math.min(nowYear + 1, yearFrom + 8) : Number(match[2]);
  if (!Number.isFinite(yearFrom) || !Number.isFinite(yearTo) || yearTo < yearFrom) {
    return null;
  }
  return { yearFrom, yearTo };
}

export function generationSpan(
  wikitext: string,
  nowYear: number,
): { yearFrom: number; yearTo: number } | null {
  const box =
    extractTemplate(wikitext, "Infobox automobile") ??
    extractTemplate(wikitext, "Infobox motorcycle");
  if (!box) return null;
  return (
    parseYearSpan(templateField(box, "model_years"), nowYear) ??
    parseYearSpan(templateField(box, "production"), nowYear)
  );
}

function fileNamesFromPage(page: WikiPage): string[] {
  const names = new Set<string>();
  if (page.imageName) names.add(page.imageName.replace(/_/g, " "));
  const box =
    extractTemplate(page.wikitext, "Infobox automobile") ??
    extractTemplate(page.wikitext, "Infobox motorcycle");
  const imageField = box ? templateField(box, "image") : null;
  if (imageField) {
    const cleaned = imageField.split("|")[0]?.replace(/^File:/i, "").trim();
    if (cleaned) names.add(cleaned);
  }
  for (const match of page.wikitext.matchAll(/\[\[(?:File|Image):([^|\]]+)/gi)) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }
  return [...names];
}

export function fileTitle(name: string): string {
  const trimmed = name.trim();
  return /^file:/i.test(trimmed) ? trimmed : `File:${trimmed}`;
}

function spanWidth(span: { yearFrom: number; yearTo: number }): number {
  return span.yearTo - span.yearFrom;
}

function pageScore(page: WikiPage, query: CatalogQuery, span: { yearFrom: number; yearTo: number }): number {
  const title = page.title.toLowerCase();
  let score = 20 - spanWidth(span);
  if (title.includes("generation")) score += 10;
  if (textMentionsModel(page.title, query.model)) score += 8;
  if (title.includes("north america")) score += 6;
  if (title.includes("europe") || title.includes("japan")) score -= 2;
  if (page.imageName && textMentionsModel(page.imageName, query.model)) score += 4;
  return score;
}

function usableFile(file: RemoteFile, query: CatalogQuery): FreeLicense | null {
  if (!isRasterMime(file.mime)) return null;
  if (file.width < 480 || file.height < 240) return null;
  if (/\.svg(\?|$)/i.test(file.title)) return null;
  if (isDetailShot(file.title) || isDetailShot(plainText(file.descriptionHtml))) {
    return null;
  }
  if (filenameConflicts(file.title, query.make)) return null;
  return parseFreeLicense(file.licenseShortName, file.licenseUrl);
}

function fileScore(file: RemoteFile, leadNames: Set<string>): number {
  const label = `${file.title} ${plainText(file.descriptionHtml)}`.toLowerCase();
  let score = 0;
  if ([...leadNames].some((name) => file.title.toLowerCase().includes(name.toLowerCase().slice(0, 24)))) {
    score += 6;
  }
  if (/\b(side|profile|quarter|3\/4)\b/.test(label)) score += 8;
  if (/\b(racing|race bike|race-replica)\b/.test(label)) score -= 8;
  if (file.width > file.height) score += 3;
  score += Math.min(4, Math.round(file.width / 1000));
  return score;
}

function toSelected(
  file: RemoteFile,
  license: FreeLicense,
  span: { yearFrom: number; yearTo: number },
  generationLabel: string,
): SelectedPhoto {
  const downloadUrl =
    file.thumbUrl && file.width >= 900 ? file.thumbUrl : file.url;
  return {
    yearFrom: span.yearFrom,
    yearTo: span.yearTo,
    generationLabel,
    downloadUrl,
    sourceUrl: file.pageUrl,
    sourceTitle: file.title.replace(/^File:/i, ""),
    author: plainText(file.artistHtml) || "Unknown author",
    license,
  };
}

function lookupFile(files: Map<string, RemoteFile>, name: string): RemoteFile | undefined {
  const wanted = normalizeTitle(fileTitle(name));
  for (const [key, file] of files) {
    if (key === wanted) return file;
  }
  return undefined;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Pick one freely licensed photo of this exact make, model, and generation.
 * Overview articles that span many generations are ignored so a new car
 * cannot reuse an older one's picture, and the reverse.
 */
export function selectGenerationPhoto(
  query: CatalogQuery,
  pages: WikiPage[],
  files: RemoteFile[],
  nowYear: number,
): SelectedPhoto | null {
  const byTitle = new Map<string, RemoteFile>();
  for (const file of files) {
    byTitle.set(normalizeTitle(file.title), file);
  }

  const ranked = pages
    .map((page) => {
      const span = generationSpan(page.wikitext, nowYear);
      if (!span) return null;
      if (query.year < span.yearFrom || query.year > span.yearTo) return null;
      if (spanWidth(span) > MAX_GENERATION_SPAN) return null;
      if (!textMentionsMake(page.title, query.make)) return null;
      const blob = `${page.title} ${page.wikitext.slice(0, 2500)} ${page.imageName ?? ""}`;
      if (!textMentionsModel(blob, query.model)) return null;
      // "1500" alone is shared by several trucks. The page title or its
      // lead image has to name that number, not just the article body.
      if (/^\d+$/.test(modelKey(query.model))) {
        const titleAndImage = `${page.title} ${page.imageName ?? ""}`;
        if (!textMentionsModel(titleAndImage, query.model)) return null;
      }
      return { page, span, score: pageScore(page, query, span) };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.score - a.score);

  for (const row of ranked) {
    const names = fileNamesFromPage(row.page);
    const lead = new Set(names.slice(0, 2));
    const candidates = names
      .map((name) => lookupFile(byTitle, name))
      .filter((file): file is RemoteFile => Boolean(file));
    let best: { file: RemoteFile; license: FreeLicense; score: number } | null = null;
    for (const file of candidates) {
      const license = usableFile(file, query);
      if (!yearsFit(file.title, row.span)) continue;
      if (!license) continue;
      const identityBlob = `${file.title} ${plainText(file.descriptionHtml)}`;
      const mentionsModel = textMentionsModel(identityBlob, query.model);
      const isLead = [...lead].some((name) =>
        normalizeTitle(file.title).includes(normalizeTitle(name).slice(0, 40)),
      );
      if (!mentionsModel && !isLead) continue;
      if (!mentionsModel && !textMentionsMake(identityBlob, query.make) && !isLead) continue;
      if (/^\d+$/.test(modelKey(query.model)) && !textMentionsModel(identityBlob, query.model)) {
        continue;
      }
      const score = fileScore(file, lead);
      if (!best || score > best.score) best = { file, license, score };
    }
    if (best) {
      const span = cacheSpan(row.page.title, row.span, best.file.title, query.year);
      return toSelected(best.file, best.license, span, row.page.title);
    }
  }

  return null;
}

function fileYears(filename: string): number[] {
  return [...filename.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
}

/** A dated file has to fall inside the generation. Undated lead images may stay. */
function yearsFit(
  filename: string,
  span: { yearFrom: number; yearTo: number },
): boolean {
  const years = fileYears(filename);
  if (years.length === 0) return true;
  return years.some((year) => year >= span.yearFrom && year <= span.yearTo);
}

function cacheSpan(
  pageTitle: string,
  pageSpan: { yearFrom: number; yearTo: number },
  filename: string,
  queryYear: number,
): { yearFrom: number; yearTo: number } {
  const namedGeneration =
    /generation/i.test(pageTitle) || /\([a-z0-9]{1,6}\)/i.test(pageTitle);
  if (namedGeneration && pageSpan.yearTo - pageSpan.yearFrom <= 10) return pageSpan;
  return (
    filenameYearSpan(filename, queryYear) ?? {
      yearFrom: queryYear,
      yearTo: queryYear,
    }
  );
}

function filenameYearSpan(filename: string, queryYear: number): { yearFrom: number; yearTo: number } | null {
  const range = filename.match(/(19|20)\d{2}\s*[–—-]\s*(19|20)\d{2}/);
  if (range) {
    const yearFrom = Number(range[0].slice(0, 4));
    const yearTo = Number(range[0].slice(-4));
    if (queryYear >= yearFrom && queryYear <= yearTo && yearTo - yearFrom <= 8) {
      return { yearFrom, yearTo };
    }
    return null;
  }
  const years = [...filename.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  if (years.some((year) => Math.abs(year - queryYear) <= 1)) {
    return { yearFrom: queryYear, yearTo: queryYear };
  }
  return null;
}

/** Commons search fallback when no generation article has a free photo. */
export function selectFilePhoto(
  query: CatalogQuery,
  files: RemoteFile[],
): SelectedPhoto | null {
  let best: { file: RemoteFile; license: FreeLicense; span: { yearFrom: number; yearTo: number }; score: number } | null =
    null;
  for (const file of files) {
    const license = usableFile(file, query);
    if (!license) continue;
    const blob = `${file.title} ${plainText(file.descriptionHtml)}`;
    if (!textMentionsMake(blob, query.make) || !textMentionsModel(blob, query.model)) continue;
    if (filenameConflicts(file.title, query.make)) continue;
    const span = filenameYearSpan(file.title, query.year);
    if (!span) continue;
    const score = fileScore(file, new Set());
    if (!best || score > best.score) best = { file, license, span, score };
  }
  if (!best) return null;
  const label = `${query.year} ${query.make} ${query.model}`;
  return toSelected(best.file, best.license, best.span, label);
}
