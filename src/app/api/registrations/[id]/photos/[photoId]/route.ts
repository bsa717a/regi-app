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
import { resolvePhotoUrl } from "@/lib/registrations/photo";
import {
  deleteRegistrationPhotoById,
  loadRegistrationPhotos,
  serializeRegistrationPhotos,
} from "@/lib/registrations/registrationPhotos";
import { serializeRegistration } from "@/lib/registrations/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 30;

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:photos:delete"),
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
 * DELETE /api/registrations/[id]/photos/[photoId]
 */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id: registrationId, photoId } = await context.params;

  const access = await loadEditableRegistration(profile.id, registrationId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  try {
    await deleteRegistrationPhotoById({
      registrationId: access.registration.id,
      photoId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404, headers: rateLimitHeaders(limited) },
      );
    }
    return NextResponse.json(
      { error: "Could not delete photo. Please try again." },
      { status: 500, headers: rateLimitHeaders(limited) },
    );
  }

  const registration = await prisma.registration.findUniqueOrThrow({
    where: { id: access.registration.id },
  });
  const config = await loadStateRules(registration.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this registration" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const photoRows = await loadRegistrationPhotos(registration.id);
  const photos = await serializeRegistrationPhotos(photoRows);
  const resolved = await resolvePhotoUrl(registration);

  return NextResponse.json(
    {
      registration: serializeRegistration(
        resolved,
        config,
        new Date(),
        "owner",
        photos,
      ),
    },
    { headers: rateLimitHeaders(limited) },
  );
}
