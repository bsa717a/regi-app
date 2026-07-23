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
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import type { MemberRole, Prisma } from "@prisma/client";
import { roleCanEdit } from "@/lib/household/roles";
import {
  getMembershipRole,
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/registrations/household";
import { serializeRegistration } from "@/lib/registrations/serialize";
import { resolvePhotoUrl } from "@/lib/registrations/photo";
import type {
  RegistrationDetails,
  RegistrationDto,
} from "@/lib/registrations/types";
import { parsePatchRegistrationBody } from "@/lib/registrations/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:registrations:id"),
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

function asDetails(value: Prisma.JsonValue): RegistrationDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as RegistrationDetails;
}

function serializeWithoutRules(
  registration: Parameters<typeof serializeRegistration>[0],
  householdRole: MemberRole,
): RegistrationDto {
  const days = daysUntilExpiration(registration.registrationExpiresOn);
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
    photoUrl: registration.photoUrl,
    bodyClass: registration.bodyClass,
    details: asDetails(registration.details),
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

async function loadAuthorizedRegistration(
  userId: string,
  registrationId: string,
) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const allowed = await userCanAccessHousehold(
    userId,
    registration.householdId,
  );
  if (!allowed) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { registration };
}

export async function GET(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedRegistration(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const registration = loaded.registration!;
  const role =
    (await getMembershipRole(profile.id, registration.householdId)) ??
    "viewer";
  const config = await loadStateRules(registration.state);
  const resolved = await resolvePhotoUrl(registration);
  const dto = config
    ? serializeRegistration(resolved, config, new Date(), role)
    : serializeWithoutRules(resolved, role);

  return NextResponse.json(
    { registration: dto },
    { headers: rateLimitHeaders(limited) },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedRegistration(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const existing = loaded.registration!;
  const ownerCheck = await requireOwner(
    profile.id,
    existing.householdId,
    "edit this registration",
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

  const nextState =
    typeof body.state === "string"
      ? body.state.trim().toUpperCase()
      : existing.state;
  const stateRules = await loadStateRules(nextState);
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

  const parsed = parsePatchRegistrationBody(
    body,
    existing.type,
    stateRules,
    {
      vin: existing.vin,
      plate: existing.plate,
      make: existing.make,
      model: existing.model,
      year: existing.year,
      details: asDetails(existing.details),
    },
  );
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const registration = await prisma.registration.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.vin !== undefined ? { vin: parsed.data.vin } : {}),
      ...(parsed.data.plate !== undefined ? { plate: parsed.data.plate } : {}),
      ...(parsed.data.state !== undefined ? { state: parsed.data.state } : {}),
      ...(parsed.data.make !== undefined ? { make: parsed.data.make } : {}),
      ...(parsed.data.model !== undefined ? { model: parsed.data.model } : {}),
      ...(parsed.data.year !== undefined ? { year: parsed.data.year } : {}),
      ...(parsed.data.nickname !== undefined
        ? { nickname: parsed.data.nickname }
        : {}),
      ...(parsed.data.photoUrl !== undefined
        ? { photoUrl: parsed.data.photoUrl }
        : {}),
      ...(parsed.data.bodyClass !== undefined
        ? { bodyClass: parsed.data.bodyClass }
        : {}),
      ...(parsed.data.details !== undefined
        ? { details: parsed.data.details as Prisma.InputJsonValue }
        : {}),
      ...(parsed.data.registrationExpiresOn !== undefined
        ? { registrationExpiresOn: parsed.data.registrationExpiresOn }
        : {}),
    },
  });

  const resolved = await resolvePhotoUrl(registration);

  return NextResponse.json(
    {
      registration: serializeRegistration(
        resolved,
        stateRules,
        new Date(),
        "owner",
      ),
    },
    { headers: rateLimitHeaders(limited) },
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedRegistration(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const existing = loaded.registration!;
  const ownerCheck = await requireOwner(
    profile.id,
    existing.householdId,
    "delete this registration",
  );
  if (!ownerCheck.ok) {
    return NextResponse.json(
      { error: ownerCheck.error },
      { status: ownerCheck.status, headers: rateLimitHeaders(limited) },
    );
  }

  await prisma.registration.delete({ where: { id: existing.id } });

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
