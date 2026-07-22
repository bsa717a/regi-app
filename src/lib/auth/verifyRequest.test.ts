import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminAuth: () => ({
    verifyIdToken,
  }),
}));

describe("verifyRequest", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("rejects missing bearer tokens", async () => {
    const { verifyRequest } = await import("@/lib/auth/verifyRequest");
    const result = await verifyRequest(
      new Request("http://localhost/api/me"),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns decoded token when Admin SDK verifies successfully", async () => {
    verifyIdToken.mockResolvedValue({ uid: "firebase-1", email: "a@b.com" });
    const { verifyRequest } = await import("@/lib/auth/verifyRequest");

    const result = await verifyRequest(
      new Request("http://localhost/api/me", {
        headers: { Authorization: "Bearer good-token" },
      }),
    );

    expect(verifyIdToken).toHaveBeenCalledWith("good-token");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.decoded.uid).toBe("firebase-1");
      expect(result.token).toBe("good-token");
    }
  });

  it("rejects invalid tokens", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));
    const { verifyRequest } = await import("@/lib/auth/verifyRequest");

    const result = await verifyRequest(
      new Request("http://localhost/api/me", {
        headers: { Authorization: "Bearer bad-token" },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });
});
