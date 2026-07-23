import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import {
  isReceiptScanConfigured,
  scanReceiptImage,
} from "@/lib/ai/receiptScan";
import { ALLOWED_CONTENT_TYPES } from "@/lib/documents/constants";
import { loadMaintenanceAccess } from "@/lib/maintenance/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 10;
const MAX_BASE64_CHARS = 10 * 1024 * 1024;

const ALLOWED_SCAN_MIME_TYPES = new Set<string>(
  ALLOWED_CONTENT_TYPES.filter((type) => type.startsWith("image/")),
);

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/registrations/[id]/maintenance/receipt/scan */
export async function POST(request: Request, context: RouteContext) {
  const limited = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:receipt:scan"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limited) },
    );
  }

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id, {
    requireEdit: true,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  if (!isReceiptScanConfigured()) {
    return NextResponse.json(
      { error: "Receipt scan is not available right now." },
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
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json(
      { error: "Image is too large. Try a smaller photo." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const scan = await scanReceiptImage({
      data: imageBase64,
      mimeType,
    });
    return NextResponse.json(
      { scan },
      { headers: rateLimitHeaders(limited) },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read the receipt";
    return NextResponse.json(
      { error: message },
      { status: 422, headers: rateLimitHeaders(limited) },
    );
  }
}
