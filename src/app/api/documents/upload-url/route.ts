import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadEditableVehicle } from "@/lib/documents/ownership";
import { buildGcsPath, parseUploadUrlBody } from "@/lib/documents/validation";
import { createUploadSignedUrl } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:documents:upload-url"),
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
 * POST /api/documents/upload-url
 * Auth + household owner → V4 signed PUT URL for a private GCS object.
 * Client must PUT with the returned requiredHeaders, then POST /api/documents.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const parsed = parseUploadUrlBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadEditableVehicle(profile.id, parsed.data.vehicleId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const gcsPath = buildGcsPath({
    householdId: access.vehicle.householdId,
    vehicleId: access.vehicle.id,
    originalFilename: parsed.data.filename,
  });

  try {
    const signed = await createUploadSignedUrl({
      gcsPath,
      contentType: parsed.data.contentType,
    });

    return NextResponse.json(
      {
        uploadUrl: signed.uploadUrl,
        gcsPath: signed.gcsPath,
        requiredHeaders: signed.requiredHeaders,
        expiresAt: signed.expiresAt.toISOString(),
      },
      { headers: rateLimitHeaders(limited) },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not prepare upload. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }
}
