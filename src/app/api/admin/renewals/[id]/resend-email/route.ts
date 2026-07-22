import { NextResponse } from "next/server";
import { resendRenewalStatusEmail } from "@/lib/admin/resendEmail";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { createNotificationService } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/renewals/[id]/resend-email
 * Re-sends the latest status notification email; audit logged.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Renewal id is required" }, { status: 400 });
  }

  try {
    const result = await resendRenewalStatusEmail(id.trim(), auth.staff, {
      db: prisma,
      notificationService: createNotificationService(),
    });

    return NextResponse.json({
      ok: true,
      templateKey: result.templateKey,
      to: result.to,
      status: result.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resend email";
    if (message === "Renewal not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "User has email notifications disabled") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[admin/renewals/resend-email]", err);
    return NextResponse.json(
      { error: "Could not resend email" },
      { status: 500 },
    );
  }
}
