import { NextResponse } from "next/server";
import {
  AdminRenewalError,
  parseAdminStatusBody,
  serializeAdminRenewalListItem,
  updateAdminRenewalStatus,
} from "@/lib/admin";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { createNotificationService } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/renewals/[id]/status
 * Body: { status: RenewalStatus }
 * Advances via advanceRenewalStatus + writes audit_log.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Renewal id is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseAdminStatusBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await updateAdminRenewalStatus(
      {
        renewalId: id.trim(),
        newStatus: parsed.status,
        staff: auth.staff,
      },
      {
        db: prisma,
        notificationService: createNotificationService(),
      },
    );

    const refreshed = await prisma.renewal.findUnique({
      where: { id: result.renewal.id },
      include: {
        vehicle: true,
        requester: { select: { id: true, email: true, name: true } },
      },
    });

    if (!refreshed) {
      return NextResponse.json(
        { error: "Status updated but renewal could not be reloaded" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      renewal: serializeAdminRenewalListItem(refreshed),
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
    });
  } catch (err) {
    if (err instanceof AdminRenewalError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin/renewals/status]", err);
    return NextResponse.json(
      { error: "Could not update renewal status" },
      { status: 500 },
    );
  }
}
