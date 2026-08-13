import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import type { RegistrationType } from "@prisma/client";
import { readManualUrl } from "@/lib/manuals/validateUrl";

export type FreeManualLookupInput = {
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  registrationType: RegistrationType;
};

export type FreeManualLookupResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const FREE_MANUAL_PROMPT = `Find the official digital owner's manual for this vehicle.

Return JSON only with this shape:
{
  "url": string | null,
  "confidence": number | null
}

Rules:
- Prefer an official manufacturer PDF or owner portal link.
- url must be a direct https link when possible.
- Return null for url if you cannot find a trustworthy official manual link.
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
    responseMimeType: "application/json",
    temperature: 0.2,
    maxOutputTokens: 512,
    thinkingConfig: { thinkingBudget: 0 },
  };

  if (isGoogleSearchEnabled()) {
    config.tools = [{ googleSearch: {} }];
  }

  return config;
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned invalid JSON");
    return JSON.parse(match[0]);
  }
}

function buildVehicleDescription(input: FreeManualLookupInput): string {
  const parts = [
    input.year ? `Year: ${input.year}` : null,
    input.make ? `Make: ${input.make}` : null,
    input.model ? `Model: ${input.model}` : null,
    input.vin ? `VIN: ${input.vin}` : null,
    `Registration type: ${input.registrationType}`,
  ].filter(Boolean);

  return parts.join("\n");
}

export async function lookupFreeOwnerManual(
  input: FreeManualLookupInput,
): Promise<FreeManualLookupResult> {
  if (!input.year && !input.make && !input.model && !input.vin) {
    return {
      ok: false,
      error: "Add a VIN or year, make, and model to search for a manual.",
    };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      ok: false,
      error: "Manual search is not available right now.",
    };
  }

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

    const text = response.text?.trim();
    if (!text) {
      return { ok: false, error: "Could not find a free digital manual." };
    }

    const parsed = parseModelJson(text) as { url?: unknown; confidence?: unknown };
    const url = readManualUrl(parsed.url);
    if (!url) {
      return { ok: false, error: "Could not find a free digital manual." };
    }

    return { ok: true, url };
  } catch {
    return { ok: false, error: "Could not find a free digital manual." };
  }
}
