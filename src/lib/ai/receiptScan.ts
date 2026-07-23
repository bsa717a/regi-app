import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";
import {
  parseExpirationDate,
  readOptionalString,
} from "@/lib/registrations/validation";

export type ReceiptScanResult = {
  performedOn: string | null;
  hoursAtService: number | null;
  milesAtService: number | null;
  /** Total amount in USD dollars (not cents). */
  costDollars: number | null;
  notes: string | null;
  shopName: string | null;
  confidence: number | null;
};

const RECEIPT_SCAN_PROMPT = `You are reading a vehicle maintenance or repair shop receipt from a photo.

Extract fields that match a service log. Use null for anything missing, illegible, or uncertain.

Field hints:
- performedOn: service / invoice date as YYYY-MM-DD
- hoursAtService: engine hours or hour-meter reading if shown (number)
- milesAtService: odometer / mileage reading if shown (number)
- costDollars: total amount charged as a number in US dollars (e.g. 89.50). Prefer the grand total / amount due.
- shopName: business or garage name
- notes: short summary of work performed (e.g. "oil change, filter") — not the full line-item dump
- confidence: 0-1 overall extraction confidence

Return JSON only:
{
  "performedOn": string | null,
  "hoursAtService": number | null,
  "milesAtService": number | null,
  "costDollars": number | null,
  "shopName": string | null,
  "notes": string | null,
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

function readNonNegNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function readPerformedOn(value: unknown): string | null {
  const raw = readOptionalString(value);
  if (!raw) return null;
  const date = parseExpirationDate(raw);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

/** Parse and validate Gemini JSON output. Invalid fields are dropped. */
export function parseReceiptScanResponse(text: string): ReceiptScanResult {
  const parsed = parseModelJson(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Model returned invalid JSON object");
  }

  const raw = parsed as Record<string, unknown>;
  const shopName = readOptionalString(raw.shopName) ?? null;
  const workNotes = readOptionalString(raw.notes) ?? null;
  const notes =
    shopName && workNotes
      ? `${shopName}: ${workNotes}`
      : shopName || workNotes;

  return {
    performedOn: readPerformedOn(raw.performedOn),
    hoursAtService: readNonNegNumber(raw.hoursAtService),
    milesAtService: readNonNegNumber(raw.milesAtService),
    costDollars: readNonNegNumber(raw.costDollars),
    notes,
    shopName,
    confidence: readConfidence(raw.confidence),
  };
}

function hasAnyExtractedField(result: ReceiptScanResult): boolean {
  return Boolean(
    result.performedOn ||
      result.hoursAtService != null ||
      result.milesAtService != null ||
      result.costDollars != null ||
      result.notes ||
      result.shopName,
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

export function isReceiptScanConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function scanReceiptImage(input: {
  data: string;
  mimeType: string;
}): Promise<ReceiptScanResult> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Receipt scan is not configured");
  }

  const response = await client.models.generateContent({
    model: getGeminiModel(),
    contents: [
      { text: RECEIPT_SCAN_PROMPT },
      { inlineData: { mimeType: input.mimeType, data: input.data } },
    ],
    config: jsonModelConfig(1024),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Model returned no text");
  }

  const result = parseReceiptScanResponse(text);
  if (!hasAnyExtractedField(result)) {
    throw new Error("Could not read the receipt");
  }

  return result;
}
