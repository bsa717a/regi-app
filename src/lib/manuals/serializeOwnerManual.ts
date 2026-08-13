import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function loadOwnerManualFilename(
  registration: Pick<Registration, "ownerManualDocumentId">,
): Promise<string | null> {
  if (!registration.ownerManualDocumentId) return null;

  const document = await prisma.document.findUnique({
    where: { id: registration.ownerManualDocumentId },
    select: { originalFilename: true },
  });

  return document?.originalFilename ?? null;
}

export async function loadOwnerManualFilenameMap(
  registrations: Pick<Registration, "id" | "ownerManualDocumentId">[],
): Promise<Map<string, string>> {
  const documentIds = [
    ...new Set(
      registrations
        .map((registration) => registration.ownerManualDocumentId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (documentIds.length === 0) return new Map();

  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, originalFilename: true },
  });

  const byId = new Map(documents.map((document) => [document.id, document.originalFilename]));
  const byRegistration = new Map<string, string>();

  for (const registration of registrations) {
    if (!registration.ownerManualDocumentId) continue;
    const filename = byId.get(registration.ownerManualDocumentId);
    if (filename) byRegistration.set(registration.id, filename);
  }

  return byRegistration;
}
