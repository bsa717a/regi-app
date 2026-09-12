import { describe, expect, it } from "vitest";
import {
  buildSentryInitOptions,
  isLocalNodeEnv,
  normalizeSentryDsn,
  resolveSentryEnvironment,
  shouldInitSentry,
} from "@/lib/sentry/config";

const DSN = "https://public@o0.ingest.sentry.io/1";

describe("normalizeSentryDsn", () => {
  it("treats blank and whitespace as missing", () => {
    expect(normalizeSentryDsn(undefined)).toBeUndefined();
    expect(normalizeSentryDsn(null)).toBeUndefined();
    expect(normalizeSentryDsn("")).toBeUndefined();
    expect(normalizeSentryDsn("   ")).toBeUndefined();
  });

  it("keeps a real DSN", () => {
    expect(normalizeSentryDsn(` ${DSN} `)).toBe(DSN);
  });
});

describe("resolveSentryEnvironment", () => {
  it("prefers explicit environment over NODE_ENV", () => {
    expect(
      resolveSentryEnvironment({
        environment: "staging",
        nodeEnv: "production",
      }),
    ).toBe("staging");
  });

  it("falls back to NODE_ENV", () => {
    expect(resolveSentryEnvironment({ nodeEnv: "production" })).toBe(
      "production",
    );
  });
});

describe("shouldInitSentry", () => {
  it("is a no-op without a DSN", () => {
    expect(
      shouldInitSentry({
        dsn: "",
        environment: "production",
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("stays off in development even with a DSN", () => {
    expect(
      shouldInitSentry({
        dsn: DSN,
        environment: "production",
        nodeEnv: "development",
      }),
    ).toBe(false);
  });

  it("stays off in test even with a DSN", () => {
    expect(
      shouldInitSentry({
        dsn: DSN,
        environment: "staging",
        nodeEnv: "test",
      }),
    ).toBe(false);
  });

  it("stays off for unmonitored environments", () => {
    expect(
      shouldInitSentry({
        dsn: DSN,
        environment: "preview",
        nodeEnv: "production",
      }),
    ).toBe(false);
  });

  it("inits in production when a DSN is set", () => {
    expect(
      shouldInitSentry({
        dsn: DSN,
        environment: "production",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });

  it("inits in staging when a DSN is set", () => {
    expect(
      shouldInitSentry({
        dsn: DSN,
        environment: "staging",
        nodeEnv: "production",
      }),
    ).toBe(true);
  });
});

describe("buildSentryInitOptions", () => {
  it("returns null when init should no-op", () => {
    expect(
      buildSentryInitOptions({
        dsn: "",
        environment: "production",
        nodeEnv: "production",
      }),
    ).toBeNull();
  });

  it("disables performance tracing for the MVP", () => {
    expect(
      buildSentryInitOptions({
        dsn: DSN,
        environment: "staging",
        nodeEnv: "production",
      }),
    ).toEqual({
      dsn: DSN,
      environment: "staging",
      enabled: true,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  });
});

describe("isLocalNodeEnv", () => {
  it("treats development and test as local", () => {
    expect(isLocalNodeEnv("development")).toBe(true);
    expect(isLocalNodeEnv("test")).toBe(true);
    expect(isLocalNodeEnv("production")).toBe(false);
  });
});
