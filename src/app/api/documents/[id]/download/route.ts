import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadAccessibleDocument } from "@/lib/documents/ownership";
import { createDownloadSignedUrl } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:documents:download"),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  });

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(result) },
    );
  }

  return result;
}

/**
 * GET /api/documents/[id]/download
 * Auth + household access → short-lived (5 min) V4 signed GET URL.
 * Never returns a public or long-lived URL.
 */
export async function GET(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Document id is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadAccessibleDocument(profile.id, id.trim());
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    const signed = await createDownloadSignedUrl({
      gcsPath: access.document.gcsPath,
      filename: access.document.originalFilename,
    });

    return NextResponse.json(
      {
        downloadUrl: signed.downloadUrl,
        expiresAt: signed.expiresAt.toISOString(),
        filename: access.document.originalFilename,
        contentTypeHint: null,
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not prepare download. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }
}
