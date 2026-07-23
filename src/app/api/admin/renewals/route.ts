import { NextResponse } from "next/server";
import {
  buildRenewalQueueWhere,
  parseRenewalStatusFilter,
  serializeAdminRenewalListItem,
} from "@/lib/admin";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/renewals?status=
 * Renewal queue filtered by status. Default = active queue (not StickerMailed).
 */
export async function GET(request: Request) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statuses = parseRenewalStatusFilter(url.searchParams.get("status"));
  if (statuses === null) {
    return NextResponse.json(
      {
        error:
          "Invalid status filter. Use active, all, or a RenewalStatus value.",
      },
      { status: 400 },
    );
  }

  const renewals = await prisma.renewal.findMany({
    where: buildRenewalQueueWhere(statuses),
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    include: {
      registration: true,
      requester: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return NextResponse.json({
    filter:
      statuses === "all"
        ? "all"
        : url.searchParams.get("status")?.trim() || "active",
    renewals: renewals.map(serializeAdminRenewalListItem),
  });
}
