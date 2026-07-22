import type { Document } from "@prisma/client";

/**
 * Merge renewal-linked documents with vehicle vault docs for completeness checks.
 * Prefer rows already attached to this renewal; otherwise include vault docs
 * (renewalId null) of the same vehicle so prior vault uploads count.
 */
export function mergeDocumentsForRenewal(
  renewalId: string,
  renewalDocuments: Document[],
  vehicleVaultDocuments: Document[],
): Document[] {
  const byId = new Map<string, Document>();

  for (const doc of renewalDocuments) {
    byId.set(doc.id, doc);
  }

  for (const doc of vehicleVaultDocuments) {
    if (doc.renewalId === renewalId || doc.renewalId == null) {
      if (!byId.has(doc.id)) {
        byId.set(doc.id, doc);
      }
    }
  }

  return [...byId.values()].sort((a, b) => {
    const typeCmp = String(a.type).localeCompare(String(b.type));
    if (typeCmp !== 0) return typeCmp;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/** Vault docs (no renewalId) that should be attached when submitting. */
export function vaultDocumentsToAttach(merged: Document[]): Document[] {
  return merged.filter((doc) => doc.renewalId == null);
}
