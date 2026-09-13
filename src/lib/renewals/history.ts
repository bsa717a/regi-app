import type { RenewalStatus } from "@prisma/client";
import { renewalStatusLabel } from "./labels";
import { RENEWAL_STATUS_ORDER } from "./status";
import type { RenewalStatusHistoryEntry, RenewalTimestamps } from "./types";

/**
 * Terminal concierge success. Today that is StickerMailed only —
 * Completed still counts as an open renewal (sticker not mailed yet).
 * Add statuses here if a future state treats another step as done.
 */
export const TERMINAL_RENEWAL_SUCCESS_STATUSES = [
  "StickerMailed",
] as const satisfies readonly RenewalStatus[];

export type TerminalRenewalSuccessStatus =
  (typeof TERMINAL_RENEWAL_SUCCESS_STATUSES)[number];

export function isTerminalRenewalSuccess(
  status: RenewalStatus,
): status is TerminalRenewalSuccessStatus {
  return (TERMINAL_RENEWAL_SUCCESS_STATUSES as readonly RenewalStatus[]).includes(
    status,
  );
}

export function buildRenewalStatusHistory(
  timestamps: RenewalTimestamps,
): RenewalStatusHistoryEntry[] {
  const atFor: Record<RenewalStatus, string | null> = {
    Requested: timestamps.requestedAt,
    DocumentsReceived: timestamps.documentsReceivedAt,
    Reviewing: timestamps.reviewingAt,
    Processing: timestamps.processingAt,
    Submitted: timestamps.submittedAt,
    Completed: timestamps.completedAt,
    StickerMailed: timestamps.stickerMailedAt,
  };

  return RENEWAL_STATUS_ORDER.map((status) => ({
    status,
    label: renewalStatusLabel(status),
    at: atFor[status],
  }));
}

export function timestampsFromRenewalDates(renewal: {
  requestedAt: Date;
  documentsReceivedAt: Date | null;
  reviewingAt: Date | null;
  processingAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  stickerMailedAt: Date | null;
}): RenewalTimestamps {
  return {
    requestedAt: renewal.requestedAt.toISOString(),
    documentsReceivedAt: renewal.documentsReceivedAt?.toISOString() ?? null,
    reviewingAt: renewal.reviewingAt?.toISOString() ?? null,
    processingAt: renewal.processingAt?.toISOString() ?? null,
    submittedAt: renewal.submittedAt?.toISOString() ?? null,
    completedAt: renewal.completedAt?.toISOString() ?? null,
    stickerMailedAt: renewal.stickerMailedAt?.toISOString() ?? null,
  };
}
