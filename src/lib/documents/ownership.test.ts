import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueVehicle,
  findUniqueDocument,
  findUniqueRenewal,
  canAccessMock,
  requireOwnerMock,
} = vi.hoisted(() => ({
  findUniqueVehicle: vi.fn(),
  findUniqueDocument: vi.fn(),
  findUniqueRenewal: vi.fn(),
  canAccessMock: vi.fn(),
  requireOwnerMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vehicle: { findUnique: findUniqueVehicle },
    document: { findUnique: findUniqueDocument },
    renewal: { findUnique: findUniqueRenewal },
  },
}));

vi.mock("@/lib/vehicles/household", () => ({
  userCanAccessHousehold: canAccessMock,
  requireOwner: requireOwnerMock,
}));

describe("document ownership checks", () => {
  beforeEach(() => {
    findUniqueVehicle.mockReset();
    findUniqueDocument.mockReset();
    findUniqueRenewal.mockReset();
    canAccessMock.mockReset();
    requireOwnerMock.mockReset();
  });

  it("hides vehicles outside the household as 404", async () => {
    const { loadAccessibleVehicle } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueVehicle.mockResolvedValue({
      id: "veh_1",
      householdId: "hh_other",
    });
    canAccessMock.mockResolvedValue(false);

    const result = await loadAccessibleVehicle("user_1", "veh_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
    expect(canAccessMock).toHaveBeenCalledWith("user_1", "hh_other");
  });

  it("allows household members to access vehicles", async () => {
    const { loadAccessibleVehicle } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueVehicle.mockResolvedValue({
      id: "veh_1",
      householdId: "hh_1",
    });
    canAccessMock.mockResolvedValue(true);

    const result = await loadAccessibleVehicle("user_1", "veh_1");
    expect(result.ok).toBe(true);
  });

  it("requires owner role for uploads/edits", async () => {
    const { loadEditableVehicle } = await import("@/lib/documents/ownership");

    findUniqueVehicle.mockResolvedValue({
      id: "veh_1",
      householdId: "hh_1",
    });
    canAccessMock.mockResolvedValue(true);
    requireOwnerMock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "You do not have permission to change documents for this vehicle",
    });

    const result = await loadEditableVehicle("viewer_1", "veh_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("scopes document access through the vehicle household", async () => {
    const { loadAccessibleDocument } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueDocument.mockResolvedValue({
      id: "doc_1",
      vehicleId: "veh_1",
      gcsPath: "households/hh_1/vehicles/veh_1/x.pdf",
      vehicle: { id: "veh_1", householdId: "hh_1" },
    });
    canAccessMock.mockResolvedValue(true);

    const result = await loadAccessibleDocument("user_1", "doc_1");
    expect(result.ok).toBe(true);
    expect(canAccessMock).toHaveBeenCalledWith("user_1", "hh_1");
  });

  it("validates renewalId belongs to the same vehicle", async () => {
    const { assertRenewalBelongsToVehicle, gcsPathMatchesVehicle } =
      await import("@/lib/documents/ownership");

    findUniqueRenewal.mockResolvedValue({
      id: "ren_1",
      vehicleId: "veh_other",
    });
    const bad = await assertRenewalBelongsToVehicle("ren_1", "veh_1");
    expect(bad.ok).toBe(false);

    findUniqueRenewal.mockResolvedValue({
      id: "ren_1",
      vehicleId: "veh_1",
    });
    const good = await assertRenewalBelongsToVehicle("ren_1", "veh_1");
    expect(good.ok).toBe(true);

    expect(
      gcsPathMatchesVehicle(
        "households/hh_1/vehicles/veh_1/uuid-file.pdf",
        "hh_1",
        "veh_1",
      ),
    ).toBe(true);
    expect(
      gcsPathMatchesVehicle(
        "households/hh_1/vehicles/veh_2/uuid-file.pdf",
        "hh_1",
        "veh_1",
      ),
    ).toBe(false);
  });
});
