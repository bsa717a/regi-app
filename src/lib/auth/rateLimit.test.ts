import { describe, expect, it } from "vitest";
import { MemoryRateLimitStore, rateLimit } from "@/lib/auth/rateLimit";

describe("rateLimit", () => {
  it("allows requests under the limit and blocks after", async () => {
    const store = new MemoryRateLimitStore();

    const first = await rateLimit({
      key: "test:ip",
      limit: 2,
      windowMs: 60_000,
      store,
    });
    const second = await rateLimit({
      key: "test:ip",
      limit: 2,
      windowMs: 60_000,
      store,
    });
    const third = await rateLimit({
      key: "test:ip",
      limit: 2,
      windowMs: 60_000,
      store,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("tracks keys independently", async () => {
    const store = new MemoryRateLimitStore();

    await rateLimit({ key: "a", limit: 1, windowMs: 60_000, store });
    const other = await rateLimit({
      key: "b",
      limit: 1,
      windowMs: 60_000,
      store,
    });

    expect(other.allowed).toBe(true);
  });
});
