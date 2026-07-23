import type { Document } from "@prisma/client";
import type { DocumentDto } from "@/lib/documents/types";

/** List/detail DTOs never include gcsPath or long-lived URLs. */
export function serializeDocument(doc: Document): DocumentDto {
  return {
    id: doc.id,
    registrationId: doc.registrationId,
    renewalId: doc.renewalId,
    type: doc.type,
    originalFilename: doc.originalFilename,
    uploadedBy: doc.uploadedBy,
    createdAt: doc.createdAt.toISOString(),
  };
}
