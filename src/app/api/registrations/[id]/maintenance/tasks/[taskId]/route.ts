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
import { remindOnFromDays } from "@/lib/maintenance/remindOn";
import { serializeTask } from "@/lib/maintenance/serialize";
import { parsePatchTaskBody } from "@/lib/maintenance/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:tasks:id"),
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

async function loadTaskForRegistration(registrationId: string, taskId: string) {
  return prisma.maintenanceTask.findFirst({
    where: { id: taskId, registrationId },
  });
}

/** PATCH /api/registrations/[id]/maintenance/tasks/[taskId] */
export async function PATCH(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id, taskId } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id, {
    requireEdit: true,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const existing = await loadTaskForRegistration(access.registration.id, taskId);
  if (!existing) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
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

  const parsed = parsePatchTaskBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  const nextMonths =
    parsed.data.intervalMonths !== undefined
      ? parsed.data.intervalMonths
      : existing.intervalMonths;
  const nextHours =
    parsed.data.intervalHours !== undefined
      ? parsed.data.intervalHours
      : existing.intervalHours;
  const nextMiles =
    parsed.data.intervalMiles !== undefined
      ? parsed.data.intervalMiles
      : existing.intervalMiles;

  if (
    !(
      (nextMonths != null && nextMonths > 0) ||
      (nextHours != null && nextHours > 0) ||
      (nextMiles != null && nextMiles > 0)
    )
  ) {
    return NextResponse.json(
      { error: "At least one interval (months, hours, or miles) is required" },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  let remindOnUpdate: { remindOn: Date | null } | Record<string, never> = {};
  if (parsed.data.clearRemind) {
    remindOnUpdate = { remindOn: null };
  } else if (parsed.data.remindInDays != null) {
    remindOnUpdate = { remindOn: remindOnFromDays(parsed.data.remindInDays) };
  }

  const task = await prisma.maintenanceTask.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.intervalMonths !== undefined
        ? { intervalMonths: parsed.data.intervalMonths }
        : {}),
      ...(parsed.data.intervalHours !== undefined
        ? { intervalHours: parsed.data.intervalHours }
        : {}),
      ...(parsed.data.intervalMiles !== undefined
        ? { intervalMiles: parsed.data.intervalMiles }
        : {}),
      ...(parsed.data.active !== undefined
        ? { active: parsed.data.active }
        : {}),
      ...remindOnUpdate,
    },
  });

  const [lastLog, latestUsage] = await Promise.all([
    prisma.maintenanceLog.findFirst({
      where: { taskId: task.id },
      orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
    }),
    prisma.usageReading.findFirst({
      where: { registrationId: access.registration.id },
      orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return NextResponse.json(
    { task: serializeTask(task, lastLog, latestUsage) },
    { headers: rateLimitHeaders(limited) },
  );
}

/** DELETE /api/registrations/[id]/maintenance/tasks/[taskId] */
export async function DELETE(request: Request, context: RouteContext) {
  const limited = await enforceRateLimit(request);
  if (limited instanceof NextResponse) return limited;

  const auth = await verifyRequest(request);
  if (!auth.ok) return auth.response;

  const profile = await getOrCreateUser(auth.decoded);
  const { id, taskId } = await context.params;
  const access = await loadMaintenanceAccess(profile.id, id, {
    requireEdit: true,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status, headers: rateLimitHeaders(limited) },
    );
  }

  const existing = await loadTaskForRegistration(access.registration.id, taskId);
  if (!existing) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: rateLimitHeaders(limited) },
    );
  }

  await prisma.maintenanceTask.delete({ where: { id: existing.id } });

  return NextResponse.json(
    { ok: true },
    { headers: rateLimitHeaders(limited) },
  );
}
