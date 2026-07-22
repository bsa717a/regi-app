import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadEditableVehicle } from "@/lib/documents/ownership";
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import {
  canStartRenewal,
  computeFeeBreakdown,
  OPEN_RENEWAL_STATUSES,
  parseCreateRenewalBody,
  serializeRenewal,
} from "@/lib/renewals";
import {
  getMembershipRole,
  userCanAccessHousehold,
} from "@/lib/vehicles/household";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

async function enforceRateLimit(request: Request, suffix: string) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, `api:renewals:${suffix}`),
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
 * GET /api/renewals?vehicleId=
 * List renewals for a household-accessible vehicle (newest first).
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, "list");
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const vehicleId = new URL(request.url).searchParams.get("vehicleId")?.trim();

  if (!vehicleId) {
    return NextResponse.json(
      { error: "vehicleId query parameter is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
    );
  }

  const allowed = await userCanAccessHousehold(profile.id, vehicle.householdId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
    );
  }

  const config = await loadStateRules(vehicle.state);
  if (!config) {
    return NextResponse.json(
      { error: "State rules are not available for this vehicle" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const role =
    (await getMembershipRole(profile.id, vehicle.householdId)) ?? "viewer";

  const renewals = await prisma.renewal.findMany({
    where: { vehicleId },
    include: {
      vehicle: true,
      documents: { orderBy: [{ type: "asc" }, { createdAt: "desc" }] },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { renewals: renewals.map((r) => serializeRenewal(r, config, role)) },
    { headers: rateLimitHeaders(limited) },
  );
}

/**
 * POST /api/renewals
 * Start (or resume) a renewal for a vehicle due for renewal.
 * Creates status Requested with fee_breakdown from state_rules.config (estimate only).
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "create");
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

  const parsed = parseCreateRenewalBody(body);
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

  const config = await loadStateRules(access.vehicle.state);
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Registration concierge is not available for this state yet. Join the waitlist from Add Vehicle.",
      },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const eligibility = canStartRenewal(
    access.vehicle.registrationExpiresOn,
    config,
  );
  if (!eligibility.ok) {
    return NextResponse.json(
      { error: eligibility.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const renewalInclude = {
    vehicle: true,
    documents: { orderBy: [{ type: "asc" as const }, { createdAt: "desc" as const }] },
  };

  // Atomic find-or-create so concurrent POSTs cannot open duplicate renewals.
  // Backed by partial unique index renewals_one_open_per_vehicle.
  try {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.renewal.findFirst({
        where: {
          vehicleId: access.vehicle.id,
          status: { in: [...OPEN_RENEWAL_STATUSES] },
        },
        include: renewalInclude,
        orderBy: { createdAt: "desc" },
      });

      if (open) {
        if (open.status === "Requested" && parsed.data.county !== undefined) {
          const feeBreakdown = computeFeeBreakdown(
            config,
            access.vehicle.registrationExpiresOn,
            { county: parsed.data.county },
          );
          const updated = await tx.renewal.update({
            where: { id: open.id },
            data: { feeBreakdown },
            include: renewalInclude,
          });
          return { renewal: updated, resumed: true as const };
        }
        return { renewal: open, resumed: true as const };
      }

      const feeBreakdown = computeFeeBreakdown(
        config,
        access.vehicle.registrationExpiresOn,
        { county: parsed.data.county ?? null },
      );

      const created = await tx.renewal.create({
        data: {
          vehicleId: access.vehicle.id,
          status: "Requested",
          requestedBy: profile.id,
          feeBreakdown,
          requestedAt: new Date(),
        },
        include: renewalInclude,
      });
      return { renewal: created, resumed: false as const };
    });

    return NextResponse.json(
      {
        renewal: serializeRenewal(result.renewal, config),
        resumed: result.resumed,
      },
      {
        status: result.resumed ? 200 : 201,
        headers: rateLimitHeaders(limited),
      },
    );
  } catch (err) {
    // Unique violation from concurrent create — resume the winner.
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      const open = await prisma.renewal.findFirst({
        where: {
          vehicleId: access.vehicle.id,
          status: { in: [...OPEN_RENEWAL_STATUSES] },
        },
        include: renewalInclude,
        orderBy: { createdAt: "desc" },
      });
      if (open) {
        return NextResponse.json(
          { renewal: serializeRenewal(open, config), resumed: true },
          { headers: rateLimitHeaders(limited) },
        );
      }
    }
    throw err;
  }
}
