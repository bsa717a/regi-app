import type { OwnerManualSource, Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage/gcs";

export async function saveOwnerManualOnRegistration(input: {
  registrationId: string;
  url: string;
  source: OwnerManualSource;
  documentId?: string | null;
}): Promise<Registration> {
  return prisma.registration.update({
    where: { id: input.registrationId },
    data: {
      ownerManualUrl: input.url,
      ownerManualSource: input.source,
      ownerManualFoundAt: new Date(),
      ownerManualDocumentId: input.documentId ?? undefined,
    },
  });
}

export async function clearOwnerManualOnRegistration(
  registrationId: string,
): Promise<void> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { ownerManualDocumentId: true },
  });

  if (registration?.ownerManualDocumentId) {
    const document = await prisma.document.findUnique({
      where: { id: registration.ownerManualDocumentId },
    });
    if (document) {
      await deleteObject(document.gcsPath).catch(() => undefined);
      await prisma.document.delete({ where: { id: document.id } }).catch(() => undefined);
    }
  }

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      ownerManualUrl: null,
      ownerManualSource: null,
      ownerManualFoundAt: null,
      ownerManualDocumentId: null,
    },
  });
}
