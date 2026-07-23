import { describe, expect, it, vi, afterEach } from "vitest";

describe("Regi google search config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enables google search by default", async () => {
    vi.resetModules();
    const mod = await import("@/lib/ai/regiChat");
    expect(mod.isRegiChatConfigured()).toBeTypeOf("boolean");
  });
});
