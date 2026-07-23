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
import { buildRegistrationDto } from "@/lib/registrations/buildRegistrationDto";
import { parsePhotoConfirmBody } from "@/lib/registrations/photo";
import {
  addRegistrationPhoto,
  syncRegistrationPhotos,
} from "@/lib/registrations/registrationPhotos";
import { objectExists } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:photos:confirm"),
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

async function registrationResponse(
  registrationId: string,
  headers: HeadersInit,
) {
  const registration = await prisma.registration.findUniqueOrThrow({
    where: { id: registrationId },
  });
  const dto = await buildRegistrationDto(registration, "owner");
  if (!dto) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers },
    );
  }

  return NextResponse.json({ registration: dto }, { headers });
}

function parsePhotoSyncBody(
  body: Record<string, unknown>,
):
  | {
      ok: true;
      data: {
        deletePhotoIds: string[];
        addGcsPaths: string[];
        coverPhotoId: string | null;
        coverAddIndex: number | null;
      };
    }
  | { ok: false; error: string } {
  const deletePhotoIds = Array.isArray(body.deletePhotoIds)
    ? body.deletePhotoIds.filter((id): id is string => typeof id === "string")
    : [];
  const addGcsPaths = Array.isArray(body.addGcsPaths)
    ? body.addGcsPaths.filter((path): path is string => typeof path === "string")
    : [];

  let coverPhotoId: string | null = null;
  if (typeof body.coverPhotoId === "string" && body.coverPhotoId.trim()) {
    coverPhotoId = body.coverPhotoId.trim();
  }

  let coverAddIndex: number | null = null;
  if (body.coverAddIndex != null) {
    const index = Number(body.coverAddIndex);
    if (!Number.isInteger(index) || index < 0) {
      return { ok: false, error: "coverAddIndex must be a non-negative integer" };
    }
    coverAddIndex = index;
  }

  return {
    ok: true,
    data: { deletePhotoIds, addGcsPaths, coverPhotoId, coverAddIndex },
  };
}

/**
 * PATCH /api/registrations/[id]/photos
 * Atomically apply staged gallery changes (delete, add, cover).
 */
export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = parsePhotoSyncBody(body);
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

  for (const gcsPath of parsed.data.addGcsPaths) {
    const exists = await objectExists(gcsPath);
    if (!exists) {
      return NextResponse.json(
        { error: "Upload not found. Please try uploading again." },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
  }

  try {
    await syncRegistrationPhotos({
      registrationId: access.registration.id,
      householdId: access.registration.householdId,
      deletePhotoIds: parsed.data.deletePhotoIds,
      addGcsPaths: parsed.data.addGcsPaths,
      coverPhotoId: parsed.data.coverPhotoId,
      coverAddIndex: parsed.data.coverAddIndex,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PHOTO_LIMIT") {
      return NextResponse.json(
        { error: "You can add up to 5 photos per registration." },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "One or more photos could not be found." },
        { status: 404, headers: rateLimitHeaders(limited) },
      );
    }
    return NextResponse.json(
      { error: "Could not save photo changes." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  return registrationResponse(
    access.registration.id,
    rateLimitHeaders(limited),
  );
}

/**
 * POST /api/registrations/[id]/photos
 * Confirm upload and append a garage photo.
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

  const exists = await objectExists(parsed.gcsPath);
  if (!exists) {
    return NextResponse.json(
      { error: "Upload not found. Please try uploading again." },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    await addRegistrationPhoto({
      registrationId: access.registration.id,
      householdId: access.registration.householdId,
      gcsPath: parsed.gcsPath,
    });
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

  return registrationResponse(
    access.registration.id,
    rateLimitHeaders(limited),
  );
}
