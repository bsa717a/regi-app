import type { Prisma, PrismaClient, RenewalStatus, StaffUser } from "@prisma/client";
import { writeAudit } from "@/lib/audit/log";
import { parseNotificationPrefs } from "@/lib/auth/notificationPrefs";
import type { NotificationService } from "@/lib/notifications/NotificationService";

export type ResendRenewalEmailDeps = {
  db: PrismaClient | Prisma.TransactionClient;
  notificationService: NotificationService;
  now?: Date;
  audit?: typeof writeAudit;
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
  return parts || "your vehicle";
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
 * Re-send the latest status notification email for a renewal (current status).
 */
export async function resendRenewalStatusEmail(
  renewalId: string,
  staff: StaffUser,
  deps: ResendRenewalEmailDeps,
): Promise<{ templateKey: string; to: string; status: RenewalStatus }> {
  const audit = deps.audit ?? writeAudit;
  const now = deps.now ?? new Date();

  const renewal = await deps.db.renewal.findUnique({
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

  if (!renewal) {
    throw new Error("Renewal not found");
  }

  const templateKey = `renewal_status_${renewal.status}`;
  const vehicleName = registrationDisplayName(renewal.registration);
  const statusLabel = friendlyStatusLabel(renewal.status);
  const prefs = parseNotificationPrefs(renewal.requester.notificationPrefs);

  if (!prefs.email) {
    throw new Error("User has email notifications disabled");
  }

  await deps.notificationService.send({
    userId: renewal.requester.id,
    channel: "email",
    templateKey,
    to: renewal.requester.email,
    variables: {
      vehicleName,
      status: statusLabel,
      statusKey: renewal.status,
      actorKind: "staff",
      resend: true,
    },
  });

  await audit(
    {
      actor: staff.firebaseUid,
      action: "renewal.resend_email",
      entity: `renewal:${renewalId}`,
      before: null,
      after: {
        templateKey,
        to: renewal.requester.email,
        status: renewal.status,
        staffId: staff.id,
        resentAt: now.toISOString(),
      },
    },
    { db: deps.db },
  );

  return {
    templateKey,
    to: renewal.requester.email,
    status: renewal.status,
  };
}
