import type { Prisma, PrismaClient, Renewal, RenewalStatus } from "@prisma/client";
import type { NotificationService } from "@/lib/notifications/NotificationService";
import { parseNotificationPrefs } from "@/lib/auth/notificationPrefs";

export const RENEWAL_STATUS_ORDER: RenewalStatus[] = [
  "Requested",
  "DocumentsReceived",
  "Reviewing",
  "Processing",
  "Submitted",
  "Completed",
  "StickerMailed",
];

const TIMESTAMP_FIELD: Record<
  RenewalStatus,
  keyof Pick<
    Renewal,
    | "requestedAt"
    | "documentsReceivedAt"
    | "reviewingAt"
    | "processingAt"
    | "submittedAt"
    | "completedAt"
    | "stickerMailedAt"
  >
> = {
  Requested: "requestedAt",
  DocumentsReceived: "documentsReceivedAt",
  Reviewing: "reviewingAt",
  Processing: "processingAt",
  Submitted: "submittedAt",
  Completed: "completedAt",
  StickerMailed: "stickerMailedAt",
};

export function statusIndex(status: RenewalStatus): number {
  return RENEWAL_STATUS_ORDER.indexOf(status);
}

/** True when `next` is exactly one step after `current`. */
export function isValidStatusTransition(
  current: RenewalStatus,
  next: RenewalStatus,
): boolean {
  const from = statusIndex(current);
  const to = statusIndex(next);
  return from >= 0 && to === from + 1;
}

export type RenewalStatusActor =
  | { kind: "user"; userId: string }
  | { kind: "staff"; staffUserId: string }
  | { kind: "system" };

export type AdvanceRenewalStatusDeps = {
  db: PrismaClient | Prisma.TransactionClient;
  notificationService: NotificationService;
  now?: Date;
  /**
   * When false, skip NotificationService.send (still records DB notification rows
   * when persistNotifications is true). Defaults to true.
   */
  sendNotifications?: boolean;
  /** Persist notification rows for the dashboard inbox. Defaults to true. */
  persistNotifications?: boolean;
};

export type AdvanceRenewalStatusResult = {
  renewal: Renewal;
  previousStatus: RenewalStatus;
  newStatus: RenewalStatus;
  transitionedAt: Date;
};

function registrationDisplayName(registration: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  if (registration.nickname?.trim()) return registration.nickname.trim();
  const parts = [registration.year, registration.make, registration.model]
    .filter(Boolean)
    .join(" ");
  return parts || "your registration";
}

function friendlyStatusLabel(status: RenewalStatus): string {
  switch (status) {
    case "Requested":
      return "Requested";
    case "DocumentsReceived":
      return "Documents Received";
    case "Reviewing":
      return "Reviewing";
    case "Processing":
      return "Processing";
    case "Submitted":
      return "Submitted";
    case "Completed":
      return "Completed";
    case "StickerMailed":
      return "Sticker Mailed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Advance a renewal one step forward, record the transition timestamp,
 * and notify the requester (email + push; SMS modeled only / skipped).
 *
 * Reusable by user submit (→ DocumentsReceived) and the future admin portal.
 */
export async function advanceRenewalStatus(
  renewalId: string,
  newStatus: RenewalStatus,
  actor: RenewalStatusActor,
  deps: AdvanceRenewalStatusDeps,
): Promise<AdvanceRenewalStatusResult> {
  const now = deps.now ?? new Date();
  const sendNotifications = deps.sendNotifications !== false;
  const persistNotifications = deps.persistNotifications !== false;

  const existing = await deps.db.renewal.findUnique({
    where: { id: renewalId },
    include: {
      registration: {
        select: {
          id: true,
          nickname: true,
          year: true,
          make: true,
          model: true,
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          notificationPrefs: true,
        },
      },
    },
  });

  if (!existing) {
    throw new Error(`Renewal not found: ${renewalId}`);
  }

  if (!isValidStatusTransition(existing.status, newStatus)) {
    throw new Error(
      `Invalid renewal status transition: ${existing.status} → ${newStatus}`,
    );
  }

  const timestampField = TIMESTAMP_FIELD[newStatus];
  const data: Prisma.RenewalUpdateInput = {
    status: newStatus,
    [timestampField]: now,
  };

  const renewal = await deps.db.renewal.update({
    where: { id: renewalId },
    data,
  });

  const templateKey = `renewal_status_${newStatus}`;
  const vehicleName = registrationDisplayName(existing.registration);
  const statusLabel = friendlyStatusLabel(newStatus);
  const variables = {
    vehicleName,
    status: statusLabel,
    statusKey: newStatus,
    actorKind: actor.kind,
  };

  const prefs = parseNotificationPrefs(existing.requester.notificationPrefs);
  const channels = (["email", "push"] as const).filter(
    (channel) => prefs[channel],
  );

  // SMS is modeled in prefs but never sent (Phase 2).
  for (const channel of channels) {
    if (persistNotifications) {
      const dedupeKey = `renewal:${renewalId}:${newStatus}:${channel}:${now.toISOString()}`;
      try {
        await deps.db.notification.create({
          data: {
            userId: existing.requester.id,
            registrationId: existing.registration.id,
            channel,
            templateKey,
            scheduledFor: now,
            sentAt: sendNotifications ? now : null,
            status: sendNotifications ? "sent" : "pending",
            dedupeKey,
          },
        });
      } catch {
        // Non-fatal: unique collisions shouldn't block the status advance.
      }
    }

    if (sendNotifications) {
      try {
        await deps.notificationService.send({
          userId: existing.requester.id,
          channel,
          templateKey,
          variables,
          to: channel === "email" ? existing.requester.email : undefined,
        });
      } catch (err) {
        console.warn(
          "[advanceRenewalStatus] notification send failed",
          { renewalId, channel, templateKey },
          err,
        );
      }
    }
  }

  return {
    renewal,
    previousStatus: existing.status,
    newStatus,
    transitionedAt: now,
  };
}
