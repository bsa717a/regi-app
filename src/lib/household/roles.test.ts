import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    householdMember: {
      findFirst,
      findMany,
    },
  },
}));

describe("household role helpers", () => {
  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset();
  });

  it("roleCanEdit allows owner and blocks viewer", async () => {
    const { roleCanEdit } = await import("@/lib/household/roles");
    expect(roleCanEdit("owner")).toBe(true);
    expect(roleCanEdit("viewer")).toBe(false);
    expect(roleCanEdit(null)).toBe(false);
  });

  it("requireOwner allows accepted owners to mutate", async () => {
    const { requireOwner } = await import("@/lib/household/roles");
    findFirst.mockResolvedValue({ role: "owner" });

    const result = await requireOwner("user_owner", "hh_1", "edit this vehicle");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.role).toBe("owner");
  });

  it("requireOwner returns 403 for viewers on mutating actions", async () => {
    const { requireOwner } = await import("@/lib/household/roles");
    findFirst.mockResolvedValue({ role: "viewer" });

    const cases = [
      "add vehicles",
      "edit this vehicle",
      "delete this vehicle",
      "change documents for this vehicle",
      "delete documents for this vehicle",
      "change this renewal",
    ];

    for (const action of cases) {
      const result = await requireOwner("user_viewer", "hh_1", action);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(403);
        expect(result.error).toContain(action);
      }
    }
  });

  it("requireMember allows viewers to read", async () => {
    const { requireMember } = await import("@/lib/household/roles");
    findFirst.mockResolvedValue({ role: "viewer" });

    const result = await requireMember("user_viewer", "hh_1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.role).toBe("viewer");
  });

  it("getAccessibleHouseholdIds includes all accepted memberships", async () => {
    const { getAccessibleHouseholdIds } = await import(
      "@/lib/household/roles"
    );
    findMany.mockResolvedValue([
      { householdId: "hh_owned", role: "owner" },
      { householdId: "hh_shared", role: "viewer" },
    ]);

    const ids = await getAccessibleHouseholdIds("user_viewer");
    expect(ids).toEqual(["hh_owned", "hh_shared"]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_viewer", inviteStatus: "accepted" },
      }),
    );
  });
});
