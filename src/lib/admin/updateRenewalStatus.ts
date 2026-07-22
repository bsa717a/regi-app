import type { Prisma, PrismaClient, Renewal, RenewalStatus, StaffUser } from "@prisma/client";
import { writeAudit } from "@/lib/audit/log";
import type { NotificationService } from "@/lib/notifications/NotificationService";
import {
  advanceRenewalStatus,
  isValidStatusTransition,
  RENEWAL_STATUS_ORDER,
} from "@/lib/renewals/status";

export type UpdateAdminRenewalStatusInput = {
  renewalId: string;
  newStatus: RenewalStatus;
  staff: StaffUser;
};

export type UpdateAdminRenewalStatusDeps = {
  db: PrismaClient | Prisma.TransactionClient;
  notificationService: NotificationService;
  now?: Date;
  advance?: typeof advanceRenewalStatus;
  audit?: typeof writeAudit;
};

export type UpdateAdminRenewalStatusResult = {
  renewal: Renewal;
  previousStatus: RenewalStatus;
  newStatus: RenewalStatus;
};

export function parseAdminStatusBody(
  body: unknown,
): { ok: true; status: RenewalStatus } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const status = (body as { status?: unknown }).status;
  if (typeof status !== "string" || !RENEWAL_STATUS_ORDER.includes(status as RenewalStatus)) {
    return {
      ok: false,
      error: `Invalid status. Expected one of: ${RENEWAL_STATUS_ORDER.join(", ")}`,
    };
  }
  return { ok: true, status: status as RenewalStatus };
}

/**
 * Staff status advance: goes through advanceRenewalStatus (notifications)
 * and always writes audit_log.
 */
export async function updateAdminRenewalStatus(
  input: UpdateAdminRenewalStatusInput,
  deps: UpdateAdminRenewalStatusDeps,
): Promise<UpdateAdminRenewalStatusResult> {
  const advance = deps.advance ?? advanceRenewalStatus;
  const audit = deps.audit ?? writeAudit;

  const existing = await deps.db.renewal.findUnique({
    where: { id: input.renewalId },
  });
  if (!existing) {
    throw new AdminRenewalError("Renewal not found", 404);
  }

  if (!isValidStatusTransition(existing.status, input.newStatus)) {
    throw new AdminRenewalError(
      `Invalid status transition: ${existing.status} → ${input.newStatus}`,
      400,
    );
  }

  const result = await advance(
    input.renewalId,
    input.newStatus,
    { kind: "staff", staffUserId: input.staff.id },
    {
      db: deps.db,
      notificationService: deps.notificationService,
      now: deps.now,
    },
  );

  await audit(
    {
      actor: input.staff.firebaseUid,
      action: "renewal.status_update",
      entity: `renewal:${input.renewalId}`,
      before: { status: result.previousStatus },
      after: {
        status: result.newStatus,
        staffId: input.staff.id,
        staffName: input.staff.name,
      },
    },
    { db: deps.db },
  );

  return {
    renewal: result.renewal,
    previousStatus: result.previousStatus,
    newStatus: result.newStatus,
  };
}

export class AdminRenewalError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminRenewalError";
    this.status = status;
  }
}
