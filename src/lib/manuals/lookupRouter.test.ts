import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Registration } from "@prisma/client";
import { routeOwnerManualLookup } from "@/lib/manuals/lookupRouter";

vi.mock("@/lib/manuals/lookupPaid", () => ({
  isVehicleDatabasesConfigured: vi.fn(() => true),
  lookupVehicleDatabasesOwnerManual: vi.fn(),
}));

import {
  isVehicleDatabasesConfigured,
  lookupVehicleDatabasesOwnerManual,
} from "@/lib/manuals/lookupPaid";

const baseRegistration = {
  id: "reg_1",
  householdId: "hh_1",
  type: "passenger",
  vin: "1HGCM82633A004352",
  plate: "ABC123",
  state: "UT",
  make: "TOYOTA",
  model: "RAV4",
  year: 2022,
  nickname: null,
  photoUrl: null,
  photoGcsPath: null,
  bodyClass: null,
  details: {},
  registrationExpiresOn: new Date("2026-12-31"),
  ownerManualUrl: null,
  ownerManualSource: null,
  ownerManualFoundAt: null,
  ownerManualDocumentId: null,
  createdBy: "user_1",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Registration;

describe("routeOwnerManualLookup", () => {
  beforeEach(() => {
    vi.mocked(isVehicleDatabasesConfigured).mockReturnValue(true);
    vi.mocked(lookupVehicleDatabasesOwnerManual).mockReset();
  });

  it("returns saved payload when provided", async () => {
    await expect(
      routeOwnerManualLookup({
        registration: baseRegistration,
        saved: {
          ok: true,
          kind: "saved",
          documentId: "doc_1",
          filename: "2022-toyota-rav4-owners-manual.pdf",
          source: "free",
          cached: true,
        },
      }),
    ).resolves.toMatchObject({ kind: "saved", documentId: "doc_1" });
  });

  it("returns pdf candidate for passenger when provider returns a manual", async () => {
    vi.mocked(lookupVehicleDatabasesOwnerManual).mockResolvedValue({
      ok: true,
      url: "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/toyota/manual.pdf",
      provider: "vehicle_databases",
    });

    const result = await routeOwnerManualLookup({ registration: baseRegistration });
    expect(result).toMatchObject({
      ok: true,
      kind: "pdf",
      previewUrl:
        "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/toyota/manual.pdf",
      libraryLabel: "Toyota Owners manuals",
    });
  });

  it("returns legacy stored pdf url when document id is missing", async () => {
    const result = await routeOwnerManualLookup({
      registration: {
        ...baseRegistration,
        ownerManualUrl:
          "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/toyota/manual.pdf",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      kind: "pdf",
      previewUrl:
        "https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/toyota/manual.pdf",
    });
    expect(lookupVehicleDatabasesOwnerManual).not.toHaveBeenCalled();
  });

  it("returns official library for non-passenger types", async () => {
    const result = await routeOwnerManualLookup({
      registration: {
        ...baseRegistration,
        type: "ohv",
        make: "Polaris",
        model: "RZR",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      kind: "library",
      label: "Polaris Owner Manuals",
    });
  });
});
