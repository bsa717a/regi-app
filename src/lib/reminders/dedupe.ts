import type { NotificationChannel } from "@prisma/client";
import { formatUtcDateKey, startOfUtcDay } from "./dates";

/**
 * Idempotency key for reminder rows.
 * Re-running the daily job with the same inputs yields the same key → no duplicates.
 */
export function buildReminderDedupeKey(params: {
  vehicleId: string;
  userId: string;
  channel: NotificationChannel;
  templateKey: string;
  scheduledFor: Date;
}): string {
  const day = formatUtcDateKey(startOfUtcDay(params.scheduledFor));
  return `${params.vehicleId}:${params.userId}:${params.channel}:${params.templateKey}:${day}`;
}
