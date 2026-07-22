import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/auth/notificationPrefs";

type MockDb = {
  user: {
    upsert: ReturnType<typeof vi.fn>;
  };
  householdMember: {
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  household: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

function makeDecoded(
  overrides: Partial<DecodedIdToken> = {},
): DecodedIdToken {
  return {
    uid: "firebase-uid-1",
    email: "alex@example.com",
    name: "Alex",
    aud: "regi",
    auth_time: 1,
    exp: 2,
    firebase: { identities: {}, sign_in_provider: "password" },
    iat: 1,
    iss: "https://securetoken.google.com/regi",
    sub: "firebase-uid-1",
    ...overrides,
  } as DecodedIdToken;
}

describe("getOrCreateUser", () => {
  let db: MockDb;

  beforeEach(() => {
    db = {
      user: { upsert: vi.fn() },
      householdMember: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      household: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };
  });

  it("creates a user and household-of-one on first login", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    db.user.upsert.mockResolvedValue({
      id: "user-1",
      firebaseUid: "firebase-uid-1",
      email: "alex@example.com",
      name: "Alex Rivera",
      phone: "8015550100",
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      createdAt: now,
      updatedAt: now,
    });
    db.householdMember.findFirst.mockResolvedValue(null);
    db.household.findFirst.mockResolvedValue(null);
    db.household.create.mockResolvedValue({ id: "hh-1" });

    const profile = await getOrCreateUser(
      makeDecoded({ name: undefined }),
      { name: "Alex Rivera", phone: "8015550100" },
      { db: db as never },
    );

    expect(db.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { firebaseUid: "firebase-uid-1" },
        create: expect.objectContaining({
          email: "alex@example.com",
          name: "Alex Rivera",
          phone: "8015550100",
          notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
        }),
      }),
    );
    expect(db.household.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: "user-1",
          members: {
            create: {
              userId: "user-1",
              role: "owner",
              inviteStatus: "accepted",
            },
          },
        }),
      }),
    );
    expect(profile.householdId).toBe("hh-1");
    expect(profile.notificationPrefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("reuses an existing owner membership without creating a household", async () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    db.user.upsert.mockResolvedValue({
      id: "user-1",
      firebaseUid: "firebase-uid-1",
      email: "alex@example.com",
      name: "Alex",
      phone: null,
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      createdAt: now,
      updatedAt: now,
    });
    db.householdMember.findFirst.mockResolvedValue({ householdId: "hh-existing" });

    const profile = await getOrCreateUser(makeDecoded(), {}, { db: db as never });

    expect(db.household.create).not.toHaveBeenCalled();
    expect(profile.householdId).toBe("hh-existing");
  });

  it("throws when the token has no email", async () => {
    await expect(
      getOrCreateUser(
        makeDecoded({ email: undefined }),
        {},
        { db: db as never },
      ),
    ).rejects.toThrow(/email/i);
  });
});
