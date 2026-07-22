import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffUser } from "@prisma/client";

const verifyIdToken = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken,
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    staffUser: {
      findUnique: vi.fn(),
    },
  },
}));

function staffFixture(overrides?: Partial<StaffUser>): StaffUser {
  return {
    id: "staff_1",
    firebaseUid: "staff-uid-1",
    name: "Riley Staff",
    role: "agent",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("verifyStaff", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("returns 401 when bearer token is missing", async () => {
    const { verifyStaff } = await import("./verifyStaff");
    const result = await verifyStaff(new Request("http://localhost/api/admin/me"));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when token is valid but uid is not allowlisted", async () => {
    verifyIdToken.mockResolvedValue({ uid: "consumer-uid", email: "a@b.com" });
    const { verifyStaff } = await import("./verifyStaff");

    const findStaff = vi.fn().mockResolvedValue(null);
    const result = await verifyStaff(
      new Request("http://localhost/api/admin/me", {
        headers: { Authorization: "Bearer good-token" },
      }),
      { findStaffByFirebaseUid: findStaff },
    );

    expect(findStaff).toHaveBeenCalledWith("consumer-uid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.error).toMatch(/staff/i);
    }
  });

  it("returns staff when uid is on the allowlist", async () => {
    verifyIdToken.mockResolvedValue({ uid: "staff-uid-1", email: "staff@regi.app" });
    const { verifyStaff } = await import("./verifyStaff");
    const staff = staffFixture();
    const findStaff = vi.fn().mockResolvedValue(staff);

    const result = await verifyStaff(
      new Request("http://localhost/api/admin/me", {
        headers: { Authorization: "Bearer staff-token" },
      }),
      { findStaffByFirebaseUid: findStaff },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.staff.id).toBe("staff_1");
      expect(result.staff.firebaseUid).toBe("staff-uid-1");
      expect(result.decoded.uid).toBe("staff-uid-1");
      expect(result.token).toBe("staff-token");
    }
  });
});
