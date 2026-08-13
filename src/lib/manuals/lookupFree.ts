import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import type { RegistrationType } from "@prisma/client";
import { extractManualUrlFromGeminiResponse } from "@/lib/manuals/extractManualUrl";
import {
  buildManualSearchQuery,
  manualDocumentLabel,
} from "@/lib/manuals/searchQuery";
import type { ManualUrlContext } from "@/lib/manuals/validateUrl";

export type FreeManualLookupInput = {
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  registrationType: RegistrationType;
};

export type FreeManualLookupResult =
  | { ok: true; url: string }
  | { ok: false; error: string; code?: "unconfigured" | "not_found" | "invalid" };

const FREE_MANUAL_PROMPT = `Find the official digital manual for this registered vehicle.

Use web search with the suggested query below. Works for cars, trucks, RVs/motorhomes, motorcycles, snowmobiles, OHV/ATV/UTV, boats, and trailers.

Return JSON only with this shape:
{
  "url": string | null,
  "confidence": number | null
}

Rules:
- Prefer an official manufacturer PDF or owner/operator portal link from the search results.
- Direct PDF links on manufacturer sites or CDNs are valid.
- Support pages that host or link to the official manual are valid when no PDF is obvious.
- url must be https.
- Return null for url only if search finds no trustworthy official manual link.
- Do not invent URLs.`;

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function isGoogleSearchEnabled(): boolean {
  const flag = process.env.REGI_ENABLE_GOOGLE_SEARCH?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function isFreeManualLookupConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function manualLookupConfig(): GenerateContentConfig {
  const config: GenerateContentConfig = {
    temperature: 0.2,
    maxOutputTokens: 768,
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (isGoogleSearchEnabled()) {
    // Google Search grounding does not reliably work with forced JSON mime type.
    config.tools = [{ googleSearch: {} }];
  } else {
    config.responseMimeType = "application/json";
  }

  return config;
}

function buildVehicleDescription(input: FreeManualLookupInput): string {
  const searchQuery = buildManualSearchQuery({
    type: input.registrationType,
    year: input.year,
    make: input.make,
    model: input.model,
  });

  const parts = [
    input.year ? `Year: ${input.year}` : null,
    input.make ? `Make: ${input.make}` : null,
    input.model ? `Model: ${input.model}` : null,
    input.vin ? `VIN: ${input.vin}` : null,
    `Registration type: ${input.registrationType}`,
    `Manual type: ${manualDocumentLabel(input.registrationType)}`,
    `Suggested search: ${searchQuery}`,
  ].filter(Boolean);

  return parts.join("\n");
}

function manualUrlContext(input: FreeManualLookupInput): ManualUrlContext {
  return { make: input.make, model: input.model };
}

export async function lookupFreeOwnerManual(
  input: FreeManualLookupInput,
): Promise<FreeManualLookupResult> {
  if (!input.year && !input.make && !input.model && !input.vin) {
    return {
      ok: false,
      code: "invalid",
      error: "Add a VIN or year, make, and model to search for a manual.",
    };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      ok: false,
      code: "unconfigured",
      error: "Manual search is not configured on this server.",
    };
  }

  const urlContext = manualUrlContext(input);

  try {
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [
        {
          text: `${FREE_MANUAL_PROMPT}\n\nVehicle:\n${buildVehicleDescription(input)}`,
        },
      ],
      config: manualLookupConfig(),
    });

    const url = extractManualUrlFromGeminiResponse(response, urlContext);
    if (!url) {
      return {
        ok: false,
        code: "not_found",
        error: "Could not find a free digital manual for this vehicle.",
      };
    }

    return { ok: true, url };
  } catch {
    return {
      ok: false,
      code: "not_found",
      error: "Manual search failed. Try again in a moment.",
    };
  }
}
