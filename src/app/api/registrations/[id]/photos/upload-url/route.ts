import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadEditableRegistration } from "@/lib/documents/ownership";
import {
  buildPhotoGcsPath,
  parsePhotoUploadUrlBody,
} from "@/lib/registrations/photo";
import {
  countRegistrationPhotos,
  MAX_REGISTRATION_PHOTOS,
} from "@/lib/registrations/registrationPhotos";
import { createUploadSignedUrl } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:photos:upload-url"),
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
 * POST /api/registrations/[id]/photos/upload-url
 * Signed PUT URL for an additional garage photo (max 5).
 */
export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id: registrationId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const parsed = parsePhotoUploadUrlBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const access = await loadEditableRegistration(profile.id, registrationId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const photoCount = await countRegistrationPhotos(access.registration.id);
  if (photoCount >= MAX_REGISTRATION_PHOTOS) {
    return NextResponse.json(
      {
        error: `You can add up to ${MAX_REGISTRATION_PHOTOS} photos per registration.`,
      },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const gcsPath = buildPhotoGcsPath({
    householdId: access.registration.householdId,
    registrationId: access.registration.id,
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
