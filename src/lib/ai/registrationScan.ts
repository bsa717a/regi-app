import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import type { RegistrationType } from "@prisma/client";
import {
  parseExpirationDate,
  readOptionalString,
  readRequiredState,
  readYear,
} from "@/lib/registrations/validation";
import { isValidRegistrationType } from "@/lib/stateEngine/registrationTypes";
import { isValidVinFormat, normalizeVin } from "@/lib/vin/decode";

export type RegistrationScanResult = {
  registrationType: RegistrationType | null;
  vin: string | null;
  plate: string | null;
  hin: string | null;
  serial: string | null;
  state: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  registrationExpiresOn: string | null;
  confidence: number | null;
};

const REGISTRATION_SCAN_PROMPT = `You are reading a US vehicle registration card, registration sticker, or title document from a photo.

Extract every field you can clearly read. Use null for anything missing, illegible, or uncertain.

registrationType must be one of: passenger, motorhome, motorcycle, trailer, ohv, snowmobile, boat — or null if unclear.
- passenger: cars, SUVs, vans, light trucks
- motorhome: self-propelled RVs (Class A, B, or C motorhomes)
- motorcycle: motorcycles and scooters
- trailer: towable trailers
- ohv: ATVs, UTVs, dirt bikes, side-by-sides
- snowmobile: snowmobiles
- boat: boats and watercraft (look for HIN)

Field hints:
- vin: 17-character vehicle identification number (no I, O, or Q)
- plate: license plate, registration number, or decal number
- hin: hull identification number on boats (often starts with US-)
- serial: manufacturer serial when no VIN/HIN
- state: 2-letter US state code issuing the registration
- year: model year as a 4-digit number
- make / model: vehicle manufacturer and model name
- registrationExpiresOn: expiration date as YYYY-MM-DD
- confidence: 0-1 overall extraction confidence

Return JSON only:
{
  "registrationType": string | null,
  "vin": string | null,
  "plate": string | null,
  "hin": string | null,
  "serial": string | null,
  "state": string | null,
  "year": number | null,
  "make": string | null,
  "model": string | null,
  "registrationExpiresOn": string | null,
  "confidence": number | null
}`;

function jsonModelConfig(maxOutputTokens: number): GenerateContentConfig {
  return {
    responseMimeType: "application/json",
    temperature: 0.2,
    maxOutputTokens,
    thinkingConfig: { thinkingBudget: 0 },
  };
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

function readConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

function readRegistrationType(value: unknown): RegistrationType | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isValidRegistrationType(normalized) ? normalized : null;
}

function readVin(value: unknown): string | null {
  const raw = readOptionalString(value);
  if (!raw) return null;
  const vin = normalizeVin(raw);
  return isValidVinFormat(vin) ? vin : null;
}

function readUpperIdentity(value: unknown): string | null {
  const raw = readOptionalString(value);
  return raw ? raw.toUpperCase() : null;
}

function readExpiration(value: unknown): string | null {
  const raw = readOptionalString(value);
  if (!raw) return null;
  const date = parseExpirationDate(raw);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

/** Parse and validate Gemini JSON output. Invalid fields are dropped, not fatal. */
export function parseRegistrationScanResponse(
  text: string,
): RegistrationScanResult {
  const parsed = parseModelJson(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Model returned invalid JSON object");
  }

  const raw = parsed as Record<string, unknown>;
  const year = readYear(raw.year);
  const stateRaw = readRequiredState(raw.state);

  return {
    registrationType: readRegistrationType(raw.registrationType),
    vin: readVin(raw.vin),
    plate: readUpperIdentity(raw.plate),
    hin: readUpperIdentity(raw.hin),
    serial: readUpperIdentity(raw.serial),
    state: stateRaw,
    year: year ?? null,
    make: readOptionalString(raw.make) ?? null,
    model: readOptionalString(raw.model) ?? null,
    registrationExpiresOn: readExpiration(raw.registrationExpiresOn),
    confidence: readConfidence(raw.confidence),
  };
}

function hasAnyExtractedField(result: RegistrationScanResult): boolean {
  return Boolean(
    result.registrationType ||
      result.vin ||
      result.plate ||
      result.hin ||
      result.serial ||
      result.state ||
      result.year ||
      result.make ||
      result.model ||
      result.registrationExpiresOn,
  );
}

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

export function isRegistrationScanConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function scanRegistrationImage(input: {
  data: string;
  mimeType: string;
}): Promise<RegistrationScanResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Registration scan is not configured");
  }

  const response = await client.models.generateContent({
    model: getGeminiModel(),
    contents: [
      { text: REGISTRATION_SCAN_PROMPT },
      { inlineData: { mimeType: input.mimeType, data: input.data } },
    ],
    config: jsonModelConfig(2048),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Model returned no text");
  }

  const result = parseRegistrationScanResponse(text);
  if (!hasAnyExtractedField(result)) {
    throw new Error("Could not read the registration card");
  }

  return result;
}
