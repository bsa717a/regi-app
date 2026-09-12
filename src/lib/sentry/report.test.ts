import { beforeEach, describe, expect, it, vi } from "vitest";

const captureExceptionSdk = vi.fn();
const getClient = vi.fn(() => undefined);
const withScope = vi.fn((callback: (scope: { setTag: () => void; setExtra: () => void }) => void) => {
  callback({ setTag: vi.fn(), setExtra: vi.fn() });
});

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureExceptionSdk(...args),
  getClient: () => getClient(),
  withScope,
}));

describe("captureException", () => {
  beforeEach(() => {
    captureExceptionSdk.mockReset();
    getClient.mockReset();
    getClient.mockReturnValue(undefined);
    withScope.mockClear();
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
  });

  it("is a no-op in test/local without calling Sentry", async () => {
    process.env.SENTRY_DSN = "https://public@o0.ingest.sentry.io/1";
    process.env.SENTRY_ENVIRONMENT = "production";
    const { captureException } = await import("@/lib/sentry/report");
    captureException(new Error("should not send"));
    expect(captureExceptionSdk).not.toHaveBeenCalled();
  });

  it("captures when the SDK is already initialized without a client-visible DSN", async () => {
    getClient.mockReturnValue({});
    const { captureException } = await import("@/lib/sentry/report");
    const error = new Error("runtime dsn client boom");
    captureException(error, { tags: { feature: "preview" } });
    expect(captureExceptionSdk).toHaveBeenCalledWith(error);
  });
});
