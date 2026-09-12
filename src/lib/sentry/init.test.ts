import { describe, expect, it, vi } from "vitest";
import { initSentry } from "@/lib/sentry/init";

describe("initSentry", () => {
  const monitored = {
    dsn: "https://key@o0.ingest.sentry.io/1",
    environment: "production",
    nodeEnv: "production",
  };

  it("does not call init without a DSN", () => {
    const init = vi.fn();
    const result = initSentry(
      { init, getClient: () => undefined },
      { ...monitored, dsn: "" },
    );
    expect(result.initialized).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("does not call init in development even with a DSN", () => {
    const init = vi.fn();
    const result = initSentry(
      { init, getClient: () => undefined },
      { ...monitored, nodeEnv: "development" },
    );
    expect(result.initialized).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("inits once in production when a DSN is set", () => {
    const init = vi.fn();
    const result = initSentry(
      { init, getClient: () => undefined },
      monitored,
    );
    expect(result.initialized).toBe(true);
    expect(init).toHaveBeenCalledWith({
      dsn: monitored.dsn,
      environment: "production",
      enabled: true,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  });

  it("skips a second init when a client already exists", () => {
    const init = vi.fn();
    const result = initSentry(
      { init, getClient: () => ({}) },
      monitored,
    );
    expect(result.initialized).toBe(true);
    expect(init).not.toHaveBeenCalled();
  });
});
