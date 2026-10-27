import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogRow, VehicleCatalogCache } from "@/lib/registrations/vehicleCatalog/resolve";

const findLicensedVehiclePhoto = vi.fn();

vi.mock("@/lib/registrations/vehicleCatalog/wikimedia", () => ({
  findLicensedVehiclePhoto: (...args: unknown[]) => findLicensedVehiclePhoto(...args),
  allowedImageDownload: (url: string) =>
    url.startsWith("https://upload.wikimedia.org/"),
}));

vi.mock("@/lib/registrations/vehicleCatalog/generateRender", () => ({
  unpaidModelRenderAvailable: () => false,
  generateModelRender: vi.fn(async () => null),
}));

import { resolveVehicleCatalog } from "@/lib/registrations/vehicleCatalog/resolve";

class MemoryCache implements VehicleCatalogCache {
  rows: CatalogRow[] = [];

  async findCovering(makeKey: string, modelKey: string, year: number) {
    const hits = this.rows.filter(
      (row) =>
        row.makeKey === makeKey &&
        row.modelKey === modelKey &&
        row.yearFrom <= year &&
        row.yearTo >= year,
    );
    return (
      hits.find((row) => row.status === "ready") ??
      hits.find((row) => row.status === "unavailable") ??
      null
    );
  }

  async upsert(row: CatalogRow) {
    const index = this.rows.findIndex(
      (existing) =>
        existing.makeKey === row.makeKey &&
        existing.modelKey === row.modelKey &&
        existing.yearFrom === row.yearFrom &&
        existing.yearTo === row.yearTo,
    );
    if (index >= 0) this.rows[index] = row;
    else this.rows.push(row);
    return row;
  }
}

describe("resolveVehicleCatalog", () => {
  let cache: MemoryCache;
  let ids: string[];

  beforeEach(() => {
    cache = new MemoryCache();
    ids = ["caccord2003aaaa", "cf1502021bbbbbb"];
    findLicensedVehiclePhoto.mockReset();
  });

  it("stores one generation photo and reuses it for another year in that generation", async () => {
    findLicensedVehiclePhoto.mockResolvedValue({
      yearFrom: 2003,
      yearTo: 2007,
      generationLabel: "Honda Accord (North America seventh generation)",
      downloadUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b9/accord.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Accord.jpg",
      sourceTitle: "03-04 Honda Accord EX sedan.jpg",
      author: "IFCAR",
      license: { name: "Public domain", url: null, shareAlike: false },
    });
    const fetchImpl = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3, 4]), { status: 200 });
    });
    const saved: string[] = [];
    const first = await resolveVehicleCatalog(
      { year: 2003, make: "Honda", model: "Accord" },
      {
        cache,
        fetchImpl,
        now: new Date("2026-10-02T00:00:00Z"),
        newId: () => ids.shift()!,
        encode: async () => Buffer.from("webp-bytes-ok"),
        saveBytes: async (id) => {
          saved.push(id);
          return { gcsPath: null, storagePath: null };
        },
      },
    );
    expect(first.status).toBe("ready");
    expect(first.url).toBe("/api/vehicle-catalog/assets/caccord2003aaaa");
    expect(first.attribution).toMatchObject({
      author: "IFCAR",
      license: "Public domain",
      shareAlike: false,
    });
    expect(saved).toEqual(["caccord2003aaaa"]);

    findLicensedVehiclePhoto.mockClear();
    const second = await resolveVehicleCatalog(
      { year: 2005, make: "Honda", model: "Accord EX" },
      { cache, fetchImpl, now: new Date("2026-10-02T00:00:00Z") },
    );
    expect(second.url).toBe(first.url);
    expect(findLicensedVehiclePhoto).not.toHaveBeenCalled();
  });

  it("does not call a paid renderer when no free photo exists", async () => {
    findLicensedVehiclePhoto.mockResolvedValue(null);
    const result = await resolveVehicleCatalog(
      { year: 1999, make: "Ford", model: "F-150" },
      {
        cache,
        now: new Date("2026-10-02T00:00:00Z"),
        newId: () => "cmissingf150ccccc",
        fetchImpl: vi.fn(),
      },
    );
    expect(result.status).toBe("unavailable");
    expect(result.url).toBeNull();
    expect(cache.rows[0]?.failureReason).toMatch(/Unpaid per-model image generation/);
    expect(findLicensedVehiclePhoto).toHaveBeenCalledTimes(1);
  });

  it("refuses a download that is not from Wikimedia", async () => {
    findLicensedVehiclePhoto.mockResolvedValue({
      yearFrom: 2019,
      yearTo: 2024,
      generationLabel: "Ram 1500 (DT)",
      downloadUrl: "https://evil.example/ram.jpg",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Ram.jpg",
      sourceTitle: "Ram.jpg",
      author: "Someone",
      license: { name: "CC BY 4.0", url: null, shareAlike: false },
    });
    const fetchImpl = vi.fn();
    const result = await resolveVehicleCatalog(
      { year: 2019, make: "Ram", model: "1500" },
      {
        cache,
        fetchImpl,
        now: new Date("2026-10-02T00:00:00Z"),
        newId: () => "cramblockeddddddd",
      },
    );
    expect(result.status).toBe("unavailable");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
