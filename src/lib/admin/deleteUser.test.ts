import { describe, expect, it, vi } from "vitest";
import { deleteAdminUser } from "./deleteUser";

describe("deleteAdminUser", () => {
  it("blocks deleting yourself", async () => {
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_1",
          firebaseUid: "fb-1",
          role: "admin",
        }),
        count: vi.fn(),
      },
    };
    const removeAccount = vi.fn();

    await expect(
      deleteAdminUser(
        { userId: "user_1", actorFirebaseUid: "fb-1" },
        { db: db as never, deleteAccount: removeAccount },
      ),
    ).rejects.toThrow(/your own account/i);
    expect(removeAccount).not.toHaveBeenCalled();
  });

  it("blocks deleting the last admin", async () => {
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_1",
          firebaseUid: "fb-1",
          role: "admin",
        }),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    const removeAccount = vi.fn();

    await expect(
      deleteAdminUser(
        { userId: "user_1", actorFirebaseUid: "other-admin" },
        { db: db as never, deleteAccount: removeAccount },
      ),
    ).rejects.toThrow(/at least one admin/i);
    expect(removeAccount).not.toHaveBeenCalled();
  });

  it("deletes another user through the shared account wipe", async () => {
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_2",
          firebaseUid: "fb-2",
          role: "user",
        }),
        count: vi.fn(),
      },
    };
    const removeAccount = vi.fn().mockResolvedValue({ ok: true });

    await deleteAdminUser(
      { userId: "user_2", actorFirebaseUid: "admin-uid" },
      { db: db as never, deleteAccount: removeAccount },
    );

    expect(removeAccount).toHaveBeenCalledWith("fb-2", { db });
  });
});
