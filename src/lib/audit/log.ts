import type { AuditLog, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WriteAuditInput = {
  actor: string;
  action: string;
  entity: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export type WriteAuditDeps = {
  db?: PrismaClient | Prisma.TransactionClient;
};

/**
 * Persist a staff (or system) action to audit_log.
 * Every admin mutation should call this.
 */
export async function writeAudit(
  input: WriteAuditInput,
  deps?: WriteAuditDeps,
): Promise<AuditLog> {
  const db = deps?.db ?? prisma;

  return db.auditLog.create({
    data: {
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
    },
  });
}
