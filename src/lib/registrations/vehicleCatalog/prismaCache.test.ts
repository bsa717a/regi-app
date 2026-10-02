import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert, deleteMany } = vi.hoisted(() => ({
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vehicleCatalogImage: { upsert, deleteMany },
  },
}));

import { createPrismaCatalogCache } from "@/lib/registrations/vehicleCatalog/prismaCache";
import type { CatalogRow } from "@/lib/registrations/vehicleCatalog/resolve";

function row(overrides: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: "cnewphotoid12345678",
    makeKey: "honda",
    modelKey: "cbr600rr",
    displayMake: "Honda",
    displayModel: "CBR600RR",
    yearFrom: 2006,
    yearTo: 2006,
    generationLabel: "2006 Honda CBR600RR",
    status: "ready",
    gcsPath: "catalog/vehicles/cnewphotoid12345678.webp",
    storagePath: null,
    author: "Rikita",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Honda_CBR600RR_2006_WSS.jpg",
    sourceTitle: "Honda CBR600RR 2006 WSS.jpg",
    shareAlike: true,
    retrievedAt: new Date("2026-10-02T00:00:00Z"),
    failureReason: null,
    updatedAt: new Date("2026-10-02T00:00:00Z"),
    ...overrides,
  };
}

describe("createPrismaCatalogCache upsert", () => {
  beforeEach(() => {
    upsert.mockReset();
    deleteMany.mockReset();
    deleteMany.mockResolvedValue({ count: 0 });
  });

  it("replaces the primary key so a retried photo matches the stored object", async () => {
    const next = row();
    upsert.mockImplementation(async ({ create, update }) => ({
      ...create,
      ...update,
      updatedAt: next.updatedAt,
    }));

    const saved = await createPrismaCatalogCache().upsert(next);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          id: "cnewphotoid12345678",
          gcsPath: "catalog/vehicles/cnewphotoid12345678.webp",
          status: "ready",
        }),
      }),
    );
    expect(saved.id).toBe("cnewphotoid12345678");
    expect(saved.gcsPath).toBe("catalog/vehicles/cnewphotoid12345678.webp");
  });
});
