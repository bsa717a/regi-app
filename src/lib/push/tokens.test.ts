import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePushToken,
  isInvalidFcmTokenError,
  pruneInvalidPushTokens,
  registerPushToken,
} from "./tokens";

function createMockDb() {
  const store = new Map<
    string,
    { id: string; userId: string; token: string; userAgent: string | null }
  >();

  return {
    store,
    pushToken: {
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => {
        const row = store.get(where.token);
        return row
          ? { id: row.id, userId: row.userId, token: row.token }
          : null;
      }),
      create: vi.fn(
        async ({
          data,
        }: {
          data: { userId: string; token: string; userAgent: string | null };
        }) => {
          const row = {
            id: `id-${store.size + 1}`,
            userId: data.userId,
            token: data.token,
            userAgent: data.userAgent,
          };
          store.set(data.token, row);
          return { id: row.id, token: row.token };
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { token: string };
          data: { userId?: string; userAgent?: string; lastSeenAt: Date };
        }) => {
          const existing = store.get(where.token)!;
          const next = {
            ...existing,
            userId: data.userId ?? existing.userId,
            userAgent: data.userAgent ?? existing.userAgent,
          };
          store.set(where.token, next);
          return { id: next.id, token: next.token };
        },
      ),
      delete: vi.fn(async ({ where }: { where: { token: string } }) => {
        store.delete(where.token);
      }),
      deleteMany: vi.fn(async ({ where }: { where: { token: { in: string[] } } }) => {
        let count = 0;
        for (const token of where.token.in) {
          if (store.delete(token)) count += 1;
        }
        return { count };
      }),
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) => {
        return [...store.values()]
          .filter((r) => r.userId === where.userId)
          .map((r) => ({ token: r.token }));
      }),
    },
  };
}

describe("push token helpers", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it("registers a new token", async () => {
    const result = await registerPushToken(
      "user-1",
      "token-abcdefg",
      "TestAgent",
      db as never,
    );
    expect(result.created).toBe(true);
    expect(db.store.get("token-abcdefg")?.userId).toBe("user-1");
  });

  it("refreshes metadata when the same user re-registers", async () => {
    await registerPushToken("user-1", "token-abcdefg", null, db as never);
    const result = await registerPushToken(
      "user-1",
      "token-abcdefg",
      "Other",
      db as never,
    );
    expect(result.created).toBe(false);
    expect(db.store.get("token-abcdefg")?.userId).toBe("user-1");
  });

  it("rejects reassignment of another user's token", async () => {
    await registerPushToken("user-1", "token-abcdefg", null, db as never);
    await expect(
      registerPushToken("user-2", "token-abcdefg", "Other", db as never),
    ).rejects.toThrow(/another account/i);
    expect(db.store.get("token-abcdefg")?.userId).toBe("user-1");
  });

  it("deletes only tokens owned by the user", async () => {
    await registerPushToken("user-1", "token-abcdefg", null, db as never);
    const denied = await deletePushToken("user-2", "token-abcdefg", db as never);
    expect(denied.deleted).toBe(false);
    const ok = await deletePushToken("user-1", "token-abcdefg", db as never);
    expect(ok.deleted).toBe(true);
    expect(db.store.size).toBe(0);
  });

  it("prunes invalid tokens", async () => {
    await registerPushToken("user-1", "bad-token-1", null, db as never);
    await registerPushToken("user-1", "good-token-1", null, db as never);
    const count = await pruneInvalidPushTokens(
      ["bad-token-1", "missing"],
      db as never,
    );
    expect(count).toBe(1);
    expect(db.store.has("good-token-1")).toBe(true);
    expect(db.store.has("bad-token-1")).toBe(false);
  });

  it("detects invalid FCM error codes", () => {
    expect(
      isInvalidFcmTokenError("messaging/registration-token-not-registered"),
    ).toBe(true);
    expect(isInvalidFcmTokenError("messaging/invalid-registration-token")).toBe(
      true,
    );
    expect(isInvalidFcmTokenError("messaging/internal-error")).toBe(false);
    expect(isInvalidFcmTokenError(undefined)).toBe(false);
  });
});
