import type { Prisma, PrismaClient, Renewal, StaffUser } from "@prisma/client";
import { writeAudit } from "@/lib/audit/log";

export type AppendStaffNoteInput = {
  renewalId: string;
  note: string;
  staff: StaffUser;
};

export type AppendStaffNoteDeps = {
  db: PrismaClient | Prisma.TransactionClient;
  now?: Date;
  audit?: typeof writeAudit;
};

export function parseNoteBody(
  body: unknown,
): { ok: true; note: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body is required" };
  }
  const note = (body as { note?: unknown }).note;
  if (typeof note !== "string" || !note.trim()) {
    return { ok: false, error: "note is required" };
  }
  if (note.trim().length > 4000) {
    return { ok: false, error: "note must be 4000 characters or fewer" };
  }
  return { ok: true, note: note.trim() };
}

export function formatStaffNoteEntry(input: {
  note: string;
  staffName: string;
  staffId: string;
  at: Date;
}): string {
  const stamp = input.at.toISOString();
  return `[${stamp}] ${input.staffName} (${input.staffId}): ${input.note}`;
}

export async function appendStaffNote(
  input: AppendStaffNoteInput,
  deps: AppendStaffNoteDeps,
): Promise<Renewal> {
  const audit = deps.audit ?? writeAudit;
  const now = deps.now ?? new Date();

  const existing = await deps.db.renewal.findUnique({
    where: { id: input.renewalId },
  });
  if (!existing) {
    throw new Error("Renewal not found");
  }

  const entry = formatStaffNoteEntry({
    note: input.note,
    staffName: input.staff.name,
    staffId: input.staff.id,
    at: now,
  });

  const nextNotes = existing.staffNotes?.trim()
    ? `${existing.staffNotes.trim()}\n\n${entry}`
    : entry;

  const renewal = await deps.db.renewal.update({
    where: { id: input.renewalId },
    data: { staffNotes: nextNotes },
  });

  await audit(
    {
      actor: input.staff.firebaseUid,
      action: "renewal.note_add",
      entity: `renewal:${input.renewalId}`,
      before: { staffNotes: existing.staffNotes },
      after: { staffNotes: nextNotes, note: input.note },
    },
    { db: deps.db },
  );

  return renewal;
}
