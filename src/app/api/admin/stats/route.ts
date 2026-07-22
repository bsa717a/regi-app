import { NextResponse } from "next/server";
import {
  ACTIVE_QUEUE_STATUSES,
  buildOverdueRenewalWhere,
} from "@/lib/admin/queue";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Ops metrics: renewals by status + overdue queue count.
 */
export async function GET(request: Request) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const [grouped, overdueCount, activeCount] = await Promise.all([
    prisma.renewal.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.renewal.count({
      where: buildOverdueRenewalWhere(),
    }),
    prisma.renewal.count({
      where: { status: { in: ACTIVE_QUEUE_STATUSES } },
    }),
  ]);

  const byStatus = Object.fromEntries(
    RENEWAL_STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<(typeof RENEWAL_STATUS_ORDER)[number], number>;

  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
  }

  return NextResponse.json({
    byStatus,
    overdueCount,
    activeQueueCount: activeCount,
    total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
  });
}
