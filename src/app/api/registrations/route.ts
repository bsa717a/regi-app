import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import {
  daysUntilExpiration,
  formatExpirationCountdown,
} from "@/lib/stateEngine/status";
import { loadStateRules, loadStateRulesMap } from "@/lib/stateEngine/loadRules";
import type { MemberRole, Prisma } from "@prisma/client";
import { roleCanEdit } from "@/lib/household/roles";
import {
  getHouseholdRoleMap,
  getPrimaryHouseholdId,
  requireOwner,
} from "@/lib/registrations/household";
import { buildRegistrationDto } from "@/lib/registrations/buildRegistrationDto";
import { serializeRegistration } from "@/lib/registrations/serialize";
import { resolvePhotoUrl, resolvePhotoUrls } from "@/lib/registrations/photo";
import {
  loadRegistrationPhotosForMany,
  serializeRegistrationPhotos,
} from "@/lib/registrations/registrationPhotos";
import type { RegistrationDto, RegistrationPhotoDto } from "@/lib/registrations/types";
import { parseCreateRegistrationBody } from "@/lib/registrations/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations"),
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

function serializeWithoutRules(
  registration: Parameters<typeof serializeRegistration>[0],
  householdRole: MemberRole,
  photos: RegistrationPhotoDto[] = [],
): RegistrationDto {
  const days = daysUntilExpiration(registration.registrationExpiresOn);
  const coverUrl =
    photos.find((photo) => photo.isCover)?.url ??
    photos[0]?.url ??
    registration.photoUrl;
  return {
    id: registration.id,
    householdId: registration.householdId,
    householdRole,
    canEdit: roleCanEdit(householdRole),
    type: registration.type,
    vin: registration.vin,
    plate: registration.plate,
    state: registration.state,
    make: registration.make,
    model: registration.model,
    year: registration.year,
    nickname: registration.nickname,
    photoUrl: coverUrl ?? null,
    photos,
    bodyClass: registration.bodyClass,
    details:
      registration.details &&
      typeof registration.details === "object" &&
      !Array.isArray(registration.details)
        ? (registration.details as RegistrationDto["details"])
        : {},
    registrationExpiresOn: registration.registrationExpiresOn
      .toISOString()
      .slice(0, 10),
    createdBy: registration.createdBy,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    status: days < 0 ? "Expired" : "Current",
    daysUntilExpiration: days,
    countdown: formatExpirationCountdown(registration.registrationExpiresOn),
  };
}

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const roleMap = await getHouseholdRoleMap(profile.id);
  const householdIds = [...roleMap.keys()];

  if (householdIds.length === 0) {
    return NextResponse.json(
      { registrations: [] },
      { headers: rateLimitHeaders(limited) },
    );
  }

  const registrations = await prisma.registration.findMany({
    where: { householdId: { in: householdIds } },
    orderBy: [{ registrationExpiresOn: "asc" }, { createdAt: "desc" }],
  });

  const rulesMap = await loadStateRulesMap(registrations.map((r) => r.state));

  let photoMap: Awaited<ReturnType<typeof loadRegistrationPhotosForMany>>;
  try {
    photoMap = await loadRegistrationPhotosForMany(
      registrations.map((registration) => registration.id),
    );
  } catch {
    photoMap = new Map();
  }

  const withPhotos = await resolvePhotoUrls(registrations);

  const dto = await Promise.all(
    withPhotos.map(async (registration) => {
      const role = roleMap.get(registration.householdId) ?? "viewer";
      const config = rulesMap.get(registration.state.toUpperCase());
      const photoRows = photoMap.get(registration.id) ?? [];
      const photos = await serializeRegistrationPhotos(photoRows);
      return config
        ? serializeRegistration(registration, config, new Date(), role, photos)
        : serializeWithoutRules(registration, role, photos);
    }),
  );

  return NextResponse.json(
    { registrations: dto },
    { headers: rateLimitHeaders(limited) },
  );
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const householdId = await getPrimaryHouseholdId(
    profile.id,
    profile.householdId,
  );

  if (!householdId) {
    return NextResponse.json(
      { error: "No household found for user" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const ownerCheck = await requireOwner(
    profile.id,
    householdId,
    "add registrations",
  );
  if (!ownerCheck.ok) {
    return NextResponse.json(
      { error: ownerCheck.error },
      { status: ownerCheck.status, headers: rateLimitHeaders(limited) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const stateHint =
    typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
  const stateRules = stateHint ? await loadStateRules(stateHint) : null;
  if (!stateRules) {
    return NextResponse.json(
      {
        error:
          "That state is not available yet. Join the waitlist from the garage.",
        code: "STATE_NOT_AVAILABLE",
      },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const parsed = parseCreateRegistrationBody(body, stateRules);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const registration = await prisma.registration.create({
    data: {
      householdId,
      type: parsed.data.type,
      vin: parsed.data.vin,
      plate: parsed.data.plate,
      state: parsed.data.state,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      nickname: parsed.data.nickname,
      photoUrl: parsed.data.photoUrl,
      bodyClass: parsed.data.bodyClass,
      details: parsed.data.details as Prisma.InputJsonValue,
      registrationExpiresOn: parsed.data.registrationExpiresOn,
      createdBy: profile.id,
    },
  });

  const resolved = await resolvePhotoUrl(registration);
  const dto =
    (await buildRegistrationDto(resolved, "owner")) ??
    serializeRegistration(resolved, stateRules, new Date(), "owner", []);

  return NextResponse.json(
    {
      registration: dto,
    },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
