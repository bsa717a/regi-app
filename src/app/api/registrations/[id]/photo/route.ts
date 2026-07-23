import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadEditableRegistration } from "@/lib/documents/ownership";
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import {
  parsePhotoConfirmBody,
  resolvePhotoUrl,
  validatePhotoGcsPath,
} from "@/lib/registrations/photo";
import { serializeRegistration } from "@/lib/registrations/serialize";
import { deleteObject, objectExists } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request, suffix: string) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, `api:registrations:photo:${suffix}`),
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
 * POST /api/registrations/[id]/photo
 * Confirm a completed GCS PUT and attach the photo to the registration.
 */
export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, "confirm");
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

  const parsed = parsePhotoConfirmBody(body);
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

  const { registration: existing } = access;
  if (
    !validatePhotoGcsPath(parsed.gcsPath, {
      householdId: existing.householdId,
      registrationId: existing.id,
    })
  ) {
    return NextResponse.json(
      { error: "Invalid photo path" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const exists = await objectExists(parsed.gcsPath);
  if (!exists) {
    return NextResponse.json(
      { error: "Upload not found. Please try uploading again." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (existing.photoGcsPath && existing.photoGcsPath !== parsed.gcsPath) {
    try {
      await deleteObject(existing.photoGcsPath);
    } catch {
      // Best-effort cleanup of the previous photo.
    }
  }

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      photoGcsPath: parsed.gcsPath,
      photoUrl: null,
    },
  });

  const config = await loadStateRules(registration.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const resolved = await resolvePhotoUrl(registration);

  return NextResponse.json(
    {
      registration: serializeRegistration(
        resolved,
        config,
        new Date(),
        "owner",
      ),
    },
    { headers: rateLimitHeaders(limited) },
  );
}

/**
 * DELETE /api/registrations/[id]/photo
 * Remove the stored vehicle photo from GCS and clear photoGcsPath.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request, "delete");
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id: registrationId } = await context.params;

  const access = await loadEditableRegistration(profile.id, registrationId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const { registration: existing } = access;
  if (!existing.photoGcsPath) {
    return NextResponse.json(
      { error: "No photo to remove" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    await deleteObject(existing.photoGcsPath);
  } catch {
    return NextResponse.json(
      { error: "Could not delete photo from storage. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      photoGcsPath: null,
      photoUrl: null,
    },
  });

  const config = await loadStateRules(registration.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    {
      registration: serializeRegistration(
        registration,
        config,
        new Date(),
        "owner",
      ),
    },
    { headers: rateLimitHeaders(limited) },
  );
}
