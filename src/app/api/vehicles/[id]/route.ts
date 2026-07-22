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
import type { MemberRole } from "@prisma/client";
import { roleCanEdit } from "@/lib/household/roles";
import {
  getMembershipRole,
  requireOwner,
  userCanAccessHousehold,
} from "@/lib/vehicles/household";
import { serializeVehicle } from "@/lib/vehicles/serialize";
import type { VehicleDto } from "@/lib/vehicles/types";
import { parsePatchVehicleBody } from "@/lib/vehicles/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:vehicles:id"),
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
  vehicle: Parameters<typeof serializeVehicle>[0],
  householdRole: MemberRole,
): VehicleDto {
  const days = daysUntilExpiration(vehicle.registrationExpiresOn);
  return {
    id: vehicle.id,
    householdId: vehicle.householdId,
    householdRole,
    canEdit: roleCanEdit(householdRole),
    vin: vehicle.vin,
    plate: vehicle.plate,
    state: vehicle.state,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    nickname: vehicle.nickname,
    photoUrl: vehicle.photoUrl,
    bodyClass: vehicle.bodyClass,
    registrationExpiresOn: vehicle.registrationExpiresOn
      .toISOString()
      .slice(0, 10),
    createdBy: vehicle.createdBy,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    status: days < 0 ? "Expired" : "Current",
    daysUntilExpiration: days,
    countdown: formatExpirationCountdown(vehicle.registrationExpiresOn),
  };
}

async function loadAuthorizedVehicle(userId: string, vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const allowed = await userCanAccessHousehold(userId, vehicle.householdId);
  if (!allowed) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { vehicle };
}

export async function GET(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const loaded = await loadAuthorizedVehicle(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const vehicle = loaded.vehicle!;
  const role =
    (await getMembershipRole(profile.id, vehicle.householdId)) ?? "viewer";
  const config = await loadStateRules(vehicle.state);
  const dto = config
    ? serializeVehicle(vehicle, config, new Date(), role)
    : serializeWithoutRules(vehicle, role);

  return NextResponse.json(
    { vehicle: dto },
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
  const loaded = await loadAuthorizedVehicle(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const existing = loaded.vehicle!;
  const ownerCheck = await requireOwner(
    profile.id,
    existing.householdId,
    "edit this vehicle",
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

  const parsed = parsePatchVehicleBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const nextState = parsed.data.state ?? existing.state;
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

  const vehicle = await prisma.vehicle.update({
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
      ...(parsed.data.registrationExpiresOn !== undefined
        ? { registrationExpiresOn: parsed.data.registrationExpiresOn }
        : {}),
    },
  });

  return NextResponse.json(
    { vehicle: serializeVehicle(vehicle, stateRules, new Date(), "owner") },
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
  const loaded = await loadAuthorizedVehicle(profile.id, id);
  if ("error" in loaded && loaded.error) return loaded.error;

  const existing = loaded.vehicle!;
  const ownerCheck = await requireOwner(
    profile.id,
    existing.householdId,
    "delete this vehicle",
  );
  if (!ownerCheck.ok) {
    return NextResponse.json(
      { error: ownerCheck.error },
      { status: ownerCheck.status, headers: rateLimitHeaders(limited) },
    );
  }

  await prisma.vehicle.delete({ where: { id: existing.id } });

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
