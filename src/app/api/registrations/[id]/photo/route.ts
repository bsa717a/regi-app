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
import {
  parsePhotoConfirmBody,
  validatePhotoGcsPath,
} from "@/lib/registrations/photo";
import { buildRegistrationDto } from "@/lib/registrations/buildRegistrationDto";
import {
  addRegistrationPhoto,
  deleteRegistrationPhotoById,
  loadRegistrationPhotos,
  syncRegistrationCoverPhoto,
} from "@/lib/registrations/registrationPhotos";
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

  const photos = await loadRegistrationPhotos(existing.id);
  const duplicate = photos.find((photo) => photo.gcsPath === parsed.gcsPath);
  if (duplicate) {
    const dto = await buildRegistrationDto(existing, "owner");
    if (!dto) {
      return NextResponse.json(
        { error: "State rules are not available for this registration" },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
    return NextResponse.json(
      { registration: dto },
      { headers: rateLimitHeaders(limited) },
    );
  }

  try {
    if (
      photos.length === 1 &&
      existing.photoGcsPath &&
      existing.photoGcsPath !== parsed.gcsPath
    ) {
      const current = photos[0]!;
      const previousGcsPath = current.gcsPath;
      await prisma.registrationPhoto.update({
        where: { id: current.id },
        data: { gcsPath: parsed.gcsPath, isCover: true },
      });
      await syncRegistrationCoverPhoto(existing.id);
      try {
        await deleteObject(previousGcsPath);
      } catch {
        // Best-effort cleanup of the replaced object.
      }
    } else {
      await addRegistrationPhoto({
        registrationId: existing.id,
        householdId: existing.householdId,
        gcsPath: parsed.gcsPath,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "PHOTO_LIMIT") {
      return NextResponse.json(
        { error: "You can add up to 5 photos per registration." },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
    return NextResponse.json(
      { error: "Invalid photo path" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const dto = await buildRegistrationDto(existing, "owner");
  if (!dto) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    { registration: dto },
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
  const photos = await loadRegistrationPhotos(existing.id);
  if (photos.length === 0 && !existing.photoGcsPath) {
    return NextResponse.json(
      { error: "No photo to remove" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (photos.length > 0) {
    for (const photo of photos) {
      try {
        await deleteRegistrationPhotoById({
          registrationId: existing.id,
          photoId: photo.id,
        });
      } catch {
        return NextResponse.json(
          { error: "Could not delete photo from storage. Please try again." },
          { status: 500, headers: rateLimitHeaders(limited) },
        );
      }
    }
  } else if (existing.photoGcsPath) {
    try {
      await deleteObject(existing.photoGcsPath);
    } catch {
      return NextResponse.json(
        { error: "Could not delete photo from storage. Please try again." },
        { status: 500, headers: rateLimitHeaders(limited) },
      );
    }

    await prisma.registration.update({
      where: { id: existing.id },
      data: {
        photoGcsPath: null,
        photoUrl: null,
      },
    });
  }

  const dto = await buildRegistrationDto(existing, "owner");
  if (!dto) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  return NextResponse.json(
    { registration: dto },
    { headers: rateLimitHeaders(limited) },
  );
}
