import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import {
  enhanceDocumentImage,
  isDocumentEnhanceConfigured,
} from "@/lib/ai/documentEnhance";
import { ALLOWED_CONTENT_TYPES } from "@/lib/documents/constants";
import { MAX_SCAN_BASE64_CHARS } from "@/lib/images/compress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 10;

const ALLOWED_SCAN_MIME_TYPES = new Set<string>(
  ALLOWED_CONTENT_TYPES.filter((type) => type.startsWith("image/")),
);

/** POST /api/images/enhance-document — photo → printable document scan. */
export async function POST(request: Request) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:images:enhance-document"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many enhance requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  await getOrCreateUser(auth.decoded);

  if (!isDocumentEnhanceConfigured()) {
    return NextResponse.json(
      { error: "Document enhance is not available right now." },
      { status: 503, headers: rateLimitHeaders(limited) },
    );
  }

  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as {
      imageBase64?: unknown;
      mimeType?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (typeof body.imageBase64 !== "string" || !body.imageBase64.trim()) {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (typeof body.mimeType !== "string" || !body.mimeType.trim()) {
    return NextResponse.json(
      { error: "mimeType is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const mimeType = body.mimeType.trim().toLowerCase();
  if (!ALLOWED_SCAN_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported image type" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const imageBase64 = body.imageBase64.trim();
  if (imageBase64.length > MAX_SCAN_BASE64_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Try a smaller photo." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const enhanced = await enhanceDocumentImage({
      data: imageBase64,
      mimeType,
    });
    return NextResponse.json(
      {
        imageBase64: enhanced.data,
        mimeType: enhanced.mimeType,
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not enhance this photo";
    return NextResponse.json(
      { error: message },
      { status: 422, headers: rateLimitHeaders(limited) },
    );
  }
}
