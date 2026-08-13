import type { OwnerManualSource, Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ownerManualSuccessPayload,
  persistOwnerManualFromPdfUrl,
} from "@/lib/manuals/persistOwnerManual";

export async function resolveStoredOwnerManual(input: {
  registration: Registration;
}): Promise<
  | ReturnType<typeof ownerManualSuccessPayload>
  | null
> {
  if (!input.registration.ownerManualDocumentId) return null;

  const document = await prisma.document.findUnique({
    where: { id: input.registration.ownerManualDocumentId },
  });
  if (!document) return null;

  return ownerManualSuccessPayload({
    documentId: document.id,
    filename: document.originalFilename,
    source: input.registration.ownerManualSource ?? "free",
    cached: true,
  });
}

export async function fulfillOwnerManualPdf(input: {
  registration: Registration;
  pdfUrl: string;
  source: OwnerManualSource;
  uploadedBy: string;
}): Promise<
  | ReturnType<typeof ownerManualSuccessPayload>
  | { ok: false; error: string; code?: string }
> {
  const stored = await resolveStoredOwnerManual({
    registration: input.registration,
  });
  if (stored) return stored;

  const persisted = await persistOwnerManualFromPdfUrl(input);
  if (!persisted.ok) {
    return persisted;
  }

  return ownerManualSuccessPayload({
    documentId: persisted.documentId,
    filename: persisted.filename,
    source: input.source,
    archived: persisted.archived,
  });
}
