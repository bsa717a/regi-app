import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import {
  clientKeyFromRequest,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/auth/rateLimit";
import { verifyRequest } from "@/lib/auth/verifyRequest";
import { loadMaintenanceAccess } from "@/lib/maintenance/access";
import { findPreset } from "@/lib/maintenance/presets";
import { loadMaintenanceOverview } from "@/lib/maintenance/loadOverview";
import { remindOnFromDays } from "@/lib/maintenance/remindOn";
import { serializeTask } from "@/lib/maintenance/serialize";
import { parseCreateTaskBody } from "@/lib/maintenance/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:tasks"),
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

/** GET /api/registrations/[id]/maintenance/tasks */
export async function GET(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const overview = await loadMaintenanceOverview(
    access.registration,
    access.canEdit,
  );

  return NextResponse.json(
    { tasks: overview.tasks },
    { headers: rateLimitHeaders(limited) },
  );
}

/** POST /api/registrations/[id]/maintenance/tasks */
export async function POST(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id, {
    requireEdit: true,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const parsed = parseCreateTaskBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  let name = parsed.data.name ?? null;
  let presetKey = parsed.data.presetKey ?? null;
  let intervalMonths = parsed.data.intervalMonths ?? null;
  let intervalHours = parsed.data.intervalHours ?? null;
  let intervalMiles = parsed.data.intervalMiles ?? null;
  let notes = parsed.data.notes ?? null;

  if (presetKey) {
    const preset = findPreset(access.registration.type, presetKey);
    if (!preset) {
      return NextResponse.json(
        { error: "Unknown preset for this vehicle type" },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }

    const existing = await prisma.maintenanceTask.findFirst({
      where: {
        registrationId: access.registration.id,
        presetKey,
        active: true,
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "That preset task is already added" },
        { status: 409, headers: rateLimitHeaders(limited) },
      );
    }

    name = name ?? preset.name;
    intervalMonths = intervalMonths ?? preset.intervalMonths ?? null;
    intervalHours = intervalHours ?? preset.intervalHours ?? null;
    intervalMiles = intervalMiles ?? preset.intervalMiles ?? null;
    notes = notes ?? preset.notes ?? null;
  }

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  if (
    !(
      (intervalMonths != null && intervalMonths > 0) ||
      (intervalHours != null && intervalHours > 0) ||
      (intervalMiles != null && intervalMiles > 0)
    )
  ) {
    return NextResponse.json(
      { error: "At least one interval (months, hours, or miles) is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const remindOn =
    parsed.data.remindInDays != null
      ? remindOnFromDays(parsed.data.remindInDays)
      : null;

  const task = await prisma.maintenanceTask.create({
    data: {
      registrationId: access.registration.id,
      name,
      presetKey,
      intervalMonths,
      intervalHours,
      intervalMiles,
      notes,
      remindOn,
    },
  });

  const latestUsage = await prisma.usageReading.findFirst({
    where: { registrationId: access.registration.id },
    orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    { task: serializeTask(task, null, latestUsage) },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
