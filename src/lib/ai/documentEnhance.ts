import { GoogleGenAI, Modality, type GenerateContentConfig } from "@google/genai";

export type EnhancedDocumentImage = {
  data: string;
  mimeType: string;
};

const DOCUMENT_ENHANCE_PROMPT = `You are converting a phone photo of a paper document into a clean printable scan.

The input may show a registration card, insurance card, title, repair receipt, or similar document, often held in a hand or at an angle.

Produce ONE edited image that:
1. Isolates the document: remove hands, fingers, tables, floors, and other background.
2. Corrects perspective so the document appears flat and rectangular (deskew / straighten).
3. Uses a plain white or very light background with the document centered and filling most of the frame.
4. Preserves ALL text, logos, barcodes, stamps, and printed details exactly — do not invent, rewrite, or omit content.
5. Improves readability for printing (even lighting, reduce glare/shadows) without changing the document's appearance.

Return only the enhanced image.`;

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

function getImageModel(): string {
  return (
    process.env.GEMINI_IMAGE_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash-image"
  );
}

export function isDocumentEnhanceConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function imageConfig(): GenerateContentConfig {
  return {
    responseModalities: [Modality.IMAGE],
    temperature: 0.2,
  };
}

function extractImagePart(response: {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string | null; mimeType?: string | null } | null;
      } | null> | null;
    } | null;
  } | null> | null;
}): EnhancedDocumentImage | null {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (!part) continue;
    const data = part.inlineData?.data?.trim();
    if (!data) continue;
    const mimeType =
      part.inlineData?.mimeType?.trim().toLowerCase() || "image/png";
    return { data, mimeType };
  }
  return null;
}

/**
 * Enhance a document photo into a flat, printable scan-like image.
 * Uses Gemini native image editing (Nano Banana / flash-image).
 */
export async function enhanceDocumentImage(input: {
  data: string;
  mimeType: string;
}): Promise<EnhancedDocumentImage> {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Document enhance is not configured");
  }

  const response = await client.models.generateContent({
    model: getImageModel(),
    contents: [
      { text: DOCUMENT_ENHANCE_PROMPT },
      { inlineData: { mimeType: input.mimeType, data: input.data } },
    ],
    config: imageConfig(),
  });

  const image = extractImagePart(response);
  if (!image) {
    throw new Error("Could not enhance this photo into a scan");
  }

  return image;
}
