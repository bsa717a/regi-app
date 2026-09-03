import type { RecallStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeRecall } from "./serialize";
import type { PatchRecallInput, RegistrationRecallDto } from "./types";

export async function updateRegistrationRecall(
  registrationId: string,
  recallId: string,
  input: PatchRecallInput,
): Promise<RegistrationRecallDto | null> {
  const existing = await prisma.registrationRecall.findFirst({
    where: { id: recallId, registrationId },
  });
  if (!existing) return null;

  const data: {
    status?: RecallStatus;
    userNotes?: string | null;
    completedAt?: Date | null;
  } = {};

  if (input.userNotes !== undefined) {
    data.userNotes = input.userNotes;
  }

  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === "completed") {
      data.completedAt = new Date();
    } else if (input.status === "open") {
      data.completedAt = null;
    } else if (input.status === "not_applicable") {
      data.completedAt = new Date();
    }
  }

  const updated = await prisma.registrationRecall.update({
    where: { id: existing.id },
    data,
  });

  return serializeRecall(updated);
}
