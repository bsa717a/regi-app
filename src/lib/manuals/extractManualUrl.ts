import type { GenerateContentResponse } from "@google/genai";
import type { ManualUrlContext } from "@/lib/manuals/validateUrl";
import { readManualUrl, readPdfManualUrl } from "@/lib/manuals/validateUrl";

const HTTPS_URL_PATTERN = /https:\/\/[^\s"'<>)\]]+/gi;

function stripUrlTrailingPunctuation(url: string): string {
  return url.replace(/[),.;:'"]+$/g, "");
}

export function extractHttpsUrls(text: string): string[] {
  const matches = text.match(HTTPS_URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of matches) {
    const cleaned = stripUrlTrailingPunctuation(match);
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      urls.push(cleaned);
    }
  }

  return urls;
}

function scoreManualUrl(url: string, context: ManualUrlContext): number {
  let score = 0;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) score += 4;
  if (/owner|manual|guide|handbook|operators|support\/article|support-documents|warranty-owners-manuals/.test(lower)) {
    score += 2;
  }
  if (context.year && lower.includes(String(context.year))) score += 3;
  if (context.model && lower.includes(context.model.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""))) {
    score += 2;
  }
  if (/\.com\.au|\.co\.uk|\.co\.nz|\.com\.mx|\.co\.jp|\.com\.br|toyota\.ca/.test(lower)) {
    score -= 8;
  }
  if (/\/owners?\/manuals?\/?$/.test(lower)) score -= 6;
  if (/google\.|youtube\.|reddit\.|facebook\.|wikipedia\.|amazon\.|ebay\./.test(lower)) {
    score -= 10;
  }
  return score;
}

export function pickBestManualUrl(
  candidates: string[],
  context: ManualUrlContext,
  options?: { pdfOnly?: boolean },
): string | null {
  const reader = options?.pdfOnly ? readPdfManualUrl : readManualUrl;
  const validated = candidates
    .map((candidate) => reader(candidate, context))
    .filter((url): url is string => Boolean(url));

  if (validated.length === 0) return null;

  return [...validated].sort(
    (left, right) => scoreManualUrl(right, context) - scoreManualUrl(left, context),
  )[0];
}

export function extractManualUrlFromGeminiResponse(
  response: GenerateContentResponse,
  context: ManualUrlContext,
  options?: { pdfOnly?: boolean },
): string | null {
  const text = response.text?.trim() ?? "";
  const candidates: string[] = [];

  if (text) {
    try {
      const parsed = JSON.parse(text) as { url?: unknown };
      if (typeof parsed.url === "string") candidates.push(parsed.url);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as { url?: unknown };
          if (typeof parsed.url === "string") candidates.push(parsed.url);
        } catch {
          // fall through to URL scan
        }
      }
    }

    candidates.push(...extractHttpsUrls(text));
  }

  const candidate = response.candidates?.[0];
  const groundingChunks = (
    candidate as { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> } }
  )?.groundingMetadata?.groundingChunks;

  if (groundingChunks) {
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) candidates.push(chunk.web.uri);
    }
  }

  return pickBestManualUrl(candidates, context, options);
}
