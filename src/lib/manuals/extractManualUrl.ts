import type { GenerateContentResponse } from "@google/genai";
import type { ManualUrlContext } from "@/lib/manuals/validateUrl";
import { readManualUrl } from "@/lib/manuals/validateUrl";

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

function scoreManualUrl(url: string): number {
  let score = 0;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) score += 4;
  if (/owner|manual|guide|handbook|operators|support\/article|support-documents/.test(lower)) {
    score += 2;
  }
  if (/google\.|youtube\.|reddit\.|facebook\.|wikipedia\.|amazon\.|ebay\./.test(lower)) {
    score -= 10;
  }
  return score;
}

export function pickBestManualUrl(
  candidates: string[],
  context: ManualUrlContext,
): string | null {
  const validated = candidates
    .map((candidate) => readManualUrl(candidate, context))
    .filter((url): url is string => Boolean(url));

  if (validated.length === 0) return null;

  return [...validated].sort(
    (left, right) => scoreManualUrl(right) - scoreManualUrl(left),
  )[0];
}

export function extractManualUrlFromGeminiResponse(
  response: GenerateContentResponse,
  context: ManualUrlContext,
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

  return pickBestManualUrl(candidates, context);
}
