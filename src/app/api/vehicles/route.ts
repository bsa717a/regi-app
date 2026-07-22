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
import type { MemberRole } from "@prisma/client";
import { roleCanEdit } from "@/lib/household/roles";
import {
  getHouseholdRoleMap,
  getPrimaryHouseholdId,
  requireOwner,
} from "@/lib/vehicles/household";
import { serializeVehicle } from "@/lib/vehicles/serialize";
import type { VehicleDto } from "@/lib/vehicles/types";
import { parseCreateVehicleBody } from "@/lib/vehicles/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:vehicles"),
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
      { vehicles: [] },
      { headers: rateLimitHeaders(limited) },
    );
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { householdId: { in: householdIds } },
    orderBy: [{ registrationExpiresOn: "asc" }, { createdAt: "desc" }],
  });

  const rulesMap = await loadStateRulesMap(vehicles.map((v) => v.state));

  const dto = vehicles.map((vehicle) => {
    const role = roleMap.get(vehicle.householdId) ?? "viewer";
    const config = rulesMap.get(vehicle.state.toUpperCase());
    return config
      ? serializeVehicle(vehicle, config, new Date(), role)
      : serializeWithoutRules(vehicle, role);
  });

  return NextResponse.json(
    { vehicles: dto },
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
    "add vehicles",
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

  const parsed = parseCreateVehicleBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const stateRules = await loadStateRules(parsed.data.state);
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

  const vehicle = await prisma.vehicle.create({
    data: {
      householdId,
      vin: parsed.data.vin,
      plate: parsed.data.plate,
      state: parsed.data.state,
      make: parsed.data.make,
      model: parsed.data.model,
      year: parsed.data.year,
      nickname: parsed.data.nickname,
      photoUrl: parsed.data.photoUrl,
      bodyClass: parsed.data.bodyClass,
      registrationExpiresOn: parsed.data.registrationExpiresOn,
      createdBy: profile.id,
    },
  });

  return NextResponse.json(
    { vehicle: serializeVehicle(vehicle, stateRules, new Date(), "owner") },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
