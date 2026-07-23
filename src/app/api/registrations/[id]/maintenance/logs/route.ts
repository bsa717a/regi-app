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
import { serializeLog } from "@/lib/maintenance/serialize";
import {
  parseCreateLogBody,
  utcDateFromIsoDay,
} from "@/lib/maintenance/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const LIMIT = 60;

type RouteContext = { params: Promise<{ id: string }> };

async function enforceRateLimit(request: Request) {
  const result = await rateLimit({
    key: clientKeyFromRequest(request, "api:maintenance:logs"),
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

/** GET /api/registrations/[id]/maintenance/logs */
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

  const logs = await prisma.maintenanceLog.findMany({
    where: { registrationId: access.registration.id },
    include: { task: { select: { name: true } } },
    orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(
    { logs: await Promise.all(logs.map((log) => serializeLog(log))) },
    { headers: rateLimitHeaders(limited) },
  );
}

/** POST /api/registrations/[id]/maintenance/logs — mark service done. */
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

  const parsed = parseCreateLogBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: rateLimitHeaders(limited) },
    );
  }

  let taskName: string | null = null;
  if (parsed.data.taskId) {
    const task = await prisma.maintenanceTask.findFirst({
      where: {
        id: parsed.data.taskId,
        registrationId: access.registration.id,
      },
      select: { id: true, name: true },
    });
    if (!task) {
      return NextResponse.json(
        { error: "Maintenance task not found" },
        { status: 400, headers: rateLimitHeaders(limited) },
      );
    }
    taskName = task.name;
  }

  const performedOn = utcDateFromIsoDay(parsed.data.performedOn);

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenanceLog.create({
      data: {
        registrationId: access.registration.id,
        taskId: parsed.data.taskId ?? null,
        performedOn,
        hoursAtService: parsed.data.hoursAtService ?? null,
        milesAtService: parsed.data.milesAtService ?? null,
        costCents: parsed.data.costCents ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { task: { select: { name: true } } },
    });

    if (
      parsed.data.hoursAtService != null ||
      parsed.data.milesAtService != null
    ) {
      // Carry forward the other axis from the latest reading so a hours-only
      // (or miles-only) log does not wipe the previously known meter value.
      const previous = await tx.usageReading.findFirst({
        where: { registrationId: access.registration.id },
        orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
        select: { hours: true, miles: true },
      });
      await tx.usageReading.create({
        data: {
          registrationId: access.registration.id,
          readingOn: performedOn,
          hours: parsed.data.hoursAtService ?? previous?.hours ?? null,
          miles: parsed.data.milesAtService ?? previous?.miles ?? null,
        },
      });
    }

    return created;
  });

  const dto = await serializeLog(log);
  return NextResponse.json(
    {
      log: {
        ...dto,
        taskName: log.task?.name ?? taskName,
      },
    },
    { status: 201, headers: rateLimitHeaders(limited) },
  );
}
