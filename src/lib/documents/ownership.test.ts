import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUniqueRegistration,
  findUniqueDocument,
  findUniqueRenewal,
  canAccessMock,
  requireOwnerMock,
} = vi.hoisted(() => ({
  findUniqueRegistration: vi.fn(),
  findUniqueDocument: vi.fn(),
  findUniqueRenewal: vi.fn(),
  canAccessMock: vi.fn(),
  requireOwnerMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registration: { findUnique: findUniqueRegistration },
    document: { findUnique: findUniqueDocument },
    renewal: { findUnique: findUniqueRenewal },
  },
}));

vi.mock("@/lib/registrations/household", () => ({
  userCanAccessHousehold: canAccessMock,
  requireOwner: requireOwnerMock,
}));

describe("document ownership checks", () => {
  beforeEach(() => {
    findUniqueRegistration.mockReset();
    findUniqueDocument.mockReset();
    findUniqueRenewal.mockReset();
    canAccessMock.mockReset();
    requireOwnerMock.mockReset();
  });

  it("hides registrations outside the household as 404", async () => {
    const { loadAccessibleRegistration } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueRegistration.mockResolvedValue({
      id: "reg_1",
      householdId: "hh_other",
    });
    canAccessMock.mockResolvedValue(false);

    const result = await loadAccessibleRegistration("user_1", "reg_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
    }
    expect(canAccessMock).toHaveBeenCalledWith("user_1", "hh_other");
  });

  it("allows household members to access registrations", async () => {
    const { loadAccessibleRegistration } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueRegistration.mockResolvedValue({
      id: "reg_1",
      householdId: "hh_1",
    });
    canAccessMock.mockResolvedValue(true);

    const result = await loadAccessibleRegistration("user_1", "reg_1");
    expect(result.ok).toBe(true);
  });

  it("requires owner role for uploads/edits", async () => {
    const { loadEditableRegistration } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueRegistration.mockResolvedValue({
      id: "reg_1",
      householdId: "hh_1",
    });
    canAccessMock.mockResolvedValue(true);
    requireOwnerMock.mockResolvedValue({
      ok: false,
      status: 403,
      error:
        "You do not have permission to change documents for this registration",
    });

    const result = await loadEditableRegistration("viewer_1", "reg_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("scopes document access through the registration household", async () => {
    const { loadAccessibleDocument } = await import(
      "@/lib/documents/ownership"
    );

    findUniqueDocument.mockResolvedValue({
      id: "doc_1",
      registrationId: "reg_1",
      gcsPath: "households/hh_1/registrations/reg_1/x.pdf",
      registration: { id: "reg_1", householdId: "hh_1" },
    });
    canAccessMock.mockResolvedValue(true);

    const result = await loadAccessibleDocument("user_1", "doc_1");
    expect(result.ok).toBe(true);
    expect(canAccessMock).toHaveBeenCalledWith("user_1", "hh_1");
  });

  it("validates renewalId belongs to the same registration", async () => {
    const { assertRenewalBelongsToRegistration, gcsPathMatchesRegistration } =
      await import("@/lib/documents/ownership");

    findUniqueRenewal.mockResolvedValue({
      id: "ren_1",
      registrationId: "reg_other",
    });
    const bad = await assertRenewalBelongsToRegistration("ren_1", "reg_1");
    expect(bad.ok).toBe(false);

    findUniqueRenewal.mockResolvedValue({
      id: "ren_1",
      registrationId: "reg_1",
    });
    const good = await assertRenewalBelongsToRegistration("ren_1", "reg_1");
    expect(good.ok).toBe(true);

    expect(
      gcsPathMatchesRegistration(
        "households/hh_1/registrations/reg_1/uuid-file.pdf",
        "hh_1",
        "reg_1",
      ),
    ).toBe(true);
    expect(
      gcsPathMatchesRegistration(
        "households/hh_1/registrations/reg_2/uuid-file.pdf",
        "hh_1",
        "reg_1",
      ),
    ).toBe(false);
  });
});
