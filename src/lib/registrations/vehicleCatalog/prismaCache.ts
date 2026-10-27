import type { VehicleCatalogImage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CatalogRow,
  VehicleCatalogCache,
} from "@/lib/registrations/vehicleCatalog/resolve";

function toRow(row: VehicleCatalogImage): CatalogRow {
  return {
    id: row.id,
    makeKey: row.makeKey,
    modelKey: row.modelKey,
    displayMake: row.displayMake,
    displayModel: row.displayModel,
    yearFrom: row.yearFrom,
    yearTo: row.yearTo,
    generationLabel: row.generationLabel,
    status: row.status,
    gcsPath: row.gcsPath,
    storagePath: row.storagePath,
    author: row.author,
    license: row.license,
    licenseUrl: row.licenseUrl,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    shareAlike: row.shareAlike,
    retrievedAt: row.retrievedAt,
    failureReason: row.failureReason,
    updatedAt: row.updatedAt,
  };
}

function rank(status: CatalogRow["status"]): number {
  if (status === "ready") return 3;
  if (status === "unavailable") return 2;
  return 1;
}

export function pickCatalogRow<T extends { status: CatalogRow["status"]; yearFrom: number; yearTo: number }>(
  rows: T[],
): T | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const byStatus = rank(b.status) - rank(a.status);
    if (byStatus !== 0) return byStatus;
    return a.yearTo - a.yearFrom - (b.yearTo - b.yearFrom);
  })[0]!;
}

export function createPrismaCatalogCache(): VehicleCatalogCache {
  return {
    async findCovering(makeKey, modelKey, year) {
      const rows = await prisma.vehicleCatalogImage.findMany({
        where: {
          makeKey,
          modelKey,
          yearFrom: { lte: year },
          yearTo: { gte: year },
        },
      });
      const best = pickCatalogRow(rows);
      return best ? toRow(best) : null;
    },
    async upsert(row) {
      if (row.status === "ready") {
        await prisma.vehicleCatalogImage.deleteMany({
          where: {
            makeKey: row.makeKey,
            modelKey: row.modelKey,
            status: "pending",
          },
        });
      }
      const saved = await prisma.vehicleCatalogImage.upsert({
        where: {
          makeKey_modelKey_yearFrom_yearTo: {
            makeKey: row.makeKey,
            modelKey: row.modelKey,
            yearFrom: row.yearFrom,
            yearTo: row.yearTo,
          },
        },
        create: {
          id: row.id,
          makeKey: row.makeKey,
          modelKey: row.modelKey,
          displayMake: row.displayMake,
          displayModel: row.displayModel,
          yearFrom: row.yearFrom,
          yearTo: row.yearTo,
          generationLabel: row.generationLabel,
          status: row.status,
          gcsPath: row.gcsPath,
          storagePath: row.storagePath,
          author: row.author,
          license: row.license,
          licenseUrl: row.licenseUrl,
          sourceUrl: row.sourceUrl,
          sourceTitle: row.sourceTitle,
          shareAlike: row.shareAlike,
          retrievedAt: row.retrievedAt,
          failureReason: row.failureReason,
        },
        update: {
          // The WebP was stored under this id. Keeping the old primary key
          // would make the asset route reject gcsPath (it must match the row id).
          id: row.id,
          displayMake: row.displayMake,
          displayModel: row.displayModel,
          generationLabel: row.generationLabel,
          status: row.status,
          gcsPath: row.gcsPath,
          storagePath: row.storagePath,
          author: row.author,
          license: row.license,
          licenseUrl: row.licenseUrl,
          sourceUrl: row.sourceUrl,
          sourceTitle: row.sourceTitle,
          shareAlike: row.shareAlike,
          retrievedAt: row.retrievedAt,
          failureReason: row.failureReason,
        },
      });
      return toRow(saved);
    },
  };
}
