import { describe, expect, it } from "vitest";
import { verifyCronSecret } from "./cronAuth";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/cron/reminders", {
    method: "POST",
    headers,
  });
}

describe("verifyCronSecret", () => {
  const env = { CRON_SECRET: "test-cron-secret" };

  it("accepts x-cron-secret header", () => {
    const result = verifyCronSecret(
      requestWith({ "x-cron-secret": "test-cron-secret" }),
      env,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts Authorization Bearer", () => {
    const result = verifyCronSecret(
      requestWith({ Authorization: "Bearer test-cron-secret" }),
      env,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects missing secret with 401", async () => {
    const result = verifyCronSecret(requestWith({}), env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects wrong secret with 401", async () => {
    const result = verifyCronSecret(
      requestWith({ "x-cron-secret": "nope" }),
      env,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    const result = verifyCronSecret(
      requestWith({ "x-cron-secret": "anything" }),
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(503);
    }
  });
});
