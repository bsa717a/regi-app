import { afterEach, describe, expect, it } from "vitest";
import { GET, healthPayload } from "./route";

const original = {
  K_SERVICE: process.env.K_SERVICE,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("healthPayload", () => {
  it("defaults to local regi / unknown", () => {
    expect(healthPayload({}, new Date("2026-09-12T00:00:00.000Z"))).toEqual({
      ok: true,
      service: "regi",
      environment: "unknown",
      timestamp: "2026-09-12T00:00:00.000Z",
    });
  });

  it("reports Cloud Run staging identity for walks", () => {
    expect(
      healthPayload({
        K_SERVICE: "regi-staging",
        SENTRY_ENVIRONMENT: "staging",
      }),
    ).toMatchObject({
      ok: true,
      service: "regi-staging",
      environment: "staging",
    });
  });
});

describe("GET /api/health", () => {
  it("returns JSON from the live env", async () => {
    process.env.K_SERVICE = "regi";
    process.env.SENTRY_ENVIRONMENT = "production";
    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      service: string;
      environment: string;
    };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("regi");
    expect(body.environment).toBe("production");
  });
});
