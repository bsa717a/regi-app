import { describe, expect, it, vi } from "vitest";
import { parseAdminUserPatch, updateAdminUser } from "./updateUser";

describe("parseAdminUserPatch", () => {
  it("rejects empty or invalid bodies", () => {
    expect(parseAdminUserPatch(null).ok).toBe(false);
    expect(parseAdminUserPatch({}).ok).toBe(false);
    expect(parseAdminUserPatch({ role: "owner" }).ok).toBe(false);
  });

  it("accepts name, phone, and app roles", () => {
    expect(parseAdminUserPatch({ name: "  Alex  ", phone: "", role: "admin" })).toEqual({
      ok: true,
      patch: { name: "Alex", phone: null, role: "admin" },
    });
    expect(parseAdminUserPatch({ role: "user" })).toEqual({
      ok: true,
      patch: { role: "user" },
    });
    expect(
      parseAdminUserPatch({
        addressLine1: " 123 Main ",
        city: "Salt Lake City",
        addressState: "ut",
        postalCode: "84101",
      }),
    ).toEqual({
      ok: true,
      patch: {
        addressLine1: "123 Main",
        city: "Salt Lake City",
        addressState: "UT",
        postalCode: "84101",
      },
    });
  });
});

describe("updateAdminUser", () => {
  const existing = {
    id: "user_1",
    firebaseUid: "fb-1",
    email: "alex@regi.app",
    name: "Alex",
    phone: "555",
    role: "user" as const,
    notificationPrefs: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  it("promotes a user to admin and upserts staff access", async () => {
    const updatedRow = {
      ...existing,
      role: "admin" as const,
      _count: { requestedRenewals: 0 },
      ownedHouseholds: [],
    };
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updatedRow),
        count: vi.fn(),
      },
      staffUser: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    const result = await updateAdminUser(
      {
        userId: "user_1",
        actorFirebaseUid: "admin-uid",
        patch: { role: "admin", name: "Alex Admin" },
      },
      { db: db as never },
    );

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "admin", name: "Alex Admin" }),
      }),
    );
    expect(db.staffUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: "fb-1" },
        create: expect.objectContaining({ role: "admin" }),
      }),
    );
    expect(result.role).toBe("admin");
    expect(result.name).toBe("Alex");
  });

  it("blocks demoting yourself", async () => {
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ ...existing, role: "admin" }),
        update: vi.fn(),
        count: vi.fn(),
      },
      staffUser: { upsert: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    };

    await expect(
      updateAdminUser(
        {
          userId: "user_1",
          actorFirebaseUid: "fb-1",
          patch: { role: "user" },
        },
        { db: db as never },
      ),
    ).rejects.toThrow(/your own admin role/i);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("blocks demoting the last admin", async () => {
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ ...existing, role: "admin" }),
        update: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      staffUser: { upsert: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    };

    await expect(
      updateAdminUser(
        {
          userId: "user_1",
          actorFirebaseUid: "other-admin",
          patch: { role: "user" },
        },
        { db: db as never },
      ),
    ).rejects.toThrow(/at least one admin/i);
  });

  it("does not revoke staff access when saving profile without a role change", async () => {
    const updatedRow = {
      ...existing,
      name: "Alex Rivera",
      _count: { requestedRenewals: 0 },
      ownedHouseholds: [],
    };
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updatedRow),
        count: vi.fn(),
      },
      staffUser: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await updateAdminUser(
      {
        userId: "user_1",
        actorFirebaseUid: "admin-uid",
        patch: { name: "Alex Rivera", city: "Ogden" },
      },
      { db: db as never },
    );

    expect(db.staffUser.deleteMany).not.toHaveBeenCalled();
    expect(db.staffUser.upsert).not.toHaveBeenCalled();
    expect(db.staffUser.updateMany).toHaveBeenCalledWith({
      where: { firebaseUid: "fb-1" },
      data: { name: "Alex Rivera" },
    });
  });
});
