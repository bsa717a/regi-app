import type { Prisma, RenewalStatus } from "@prisma/client";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";

/** Statuses considered still in the active ops queue (work remaining). */
export const ACTIVE_QUEUE_STATUSES: RenewalStatus[] = RENEWAL_STATUS_ORDER.filter(
  (s) => s !== "StickerMailed",
);

export function parseRenewalStatusFilter(
  raw: string | null,
): RenewalStatus[] | "all" | null {
  if (raw == null || raw.trim() === "" || raw === "active") {
    return ACTIVE_QUEUE_STATUSES;
  }
  if (raw === "all") return "all";

  const value = raw.trim() as RenewalStatus;
  if (!RENEWAL_STATUS_ORDER.includes(value)) {
    return null;
  }
  return [value];
}

export function buildRenewalQueueWhere(
  statuses: RenewalStatus[] | "all",
): Prisma.RenewalWhereInput {
  if (statuses === "all") return {};
  return { status: { in: statuses } };
}

/**
 * Overdue = active renewal whose registration has already expired.
 */
export function buildOverdueRenewalWhere(now = new Date()): Prisma.RenewalWhereInput {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return {
    status: { in: ACTIVE_QUEUE_STATUSES },
    registration: {
      registrationExpiresOn: { lt: day },
    },
  };
}
