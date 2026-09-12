import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailDeliveryNotConfiguredError } from "@/lib/auth/transactionalEmail";

const verifyRequest = vi.fn();
const sendVerificationEmail = vi.fn();
const createEmailProviderFromEnv = vi.fn();
const resolveAppOrigin = vi.fn();
const rateLimit = vi.fn();

vi.mock("@/lib/auth/verifyRequest", () => ({
  verifyRequest: (...args: unknown[]) => verifyRequest(...args),
}));

vi.mock("@/lib/auth/sendVerificationEmail", () => ({
  EmailDeliveryNotConfiguredError,
  sendVerificationEmail: (...args: unknown[]) => sendVerificationEmail(...args),
}));

vi.mock("@/lib/notifications/SendGridEmailProvider", () => ({
  createEmailProviderFromEnv: (...args: unknown[]) =>
    createEmailProviderFromEnv(...args),
}));

vi.mock("@/lib/household/appOrigin", () => ({
  resolveAppOrigin: (...args: unknown[]) => resolveAppOrigin(...args),
}));

vi.mock("@/lib/auth/rateLimit", () => ({
  clientKeyFromRequest: () => "api:verification-email:test",
  rateLimit: (...args: unknown[]) => rateLimit(...args),
  rateLimitHeaders: () => ({
    "X-RateLimit-Limit": "8",
    "X-RateLimit-Remaining": "7",
    "X-RateLimit-Reset": "1",
  }),
}));

describe("POST /api/auth/verification-email", () => {
  beforeEach(() => {
    verifyRequest.mockReset();
    sendVerificationEmail.mockReset();
    createEmailProviderFromEnv.mockReset();
    resolveAppOrigin.mockReset();
    rateLimit.mockReset();

    rateLimit.mockResolvedValue({
      allowed: true,
      remaining: 7,
      resetAt: Date.now() + 60_000,
      limit: 8,
    });
    resolveAppOrigin.mockReturnValue("https://app.regireg.com");
    createEmailProviderFromEnv.mockReturnValue({ send: vi.fn() });
  });

  async function post() {
    const { POST } = await import("./route");
    return POST(
      new Request("http://localhost/api/auth/verification-email", {
        method: "POST",
      }),
    );
  }

  it("rejects unauthenticated requests", async () => {
    verifyRequest.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    });

    const response = await post();
    expect(response.status).toBe(401);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("requires an email on the account", async () => {
    verifyRequest.mockResolvedValue({
      ok: true,
      decoded: { email: "  ", email_verified: false },
      token: "tok",
    });

    const response = await post();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This account does not have an email address.",
    });
  });

  it("no-ops when the address is already verified", async () => {
    verifyRequest.mockResolvedValue({
      ok: true,
      decoded: { email: "alex@example.com", email_verified: true },
      token: "tok",
    });

    const response = await post();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sent: true,
      alreadyVerified: true,
    });
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a verification email", async () => {
    verifyRequest.mockResolvedValue({
      ok: true,
      decoded: { email: "alex@example.com", email_verified: false },
      token: "tok",
    });
    sendVerificationEmail.mockResolvedValue(undefined);

    const response = await post();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sent: true });
    expect(sendVerificationEmail).toHaveBeenCalledWith({
      email: "alex@example.com",
      appOrigin: "https://app.regireg.com",
      emailProvider: expect.anything(),
    });
  });

  it("returns 503 when delivery is not configured", async () => {
    verifyRequest.mockResolvedValue({
      ok: true,
      decoded: { email: "alex@example.com", email_verified: false },
      token: "tok",
    });
    sendVerificationEmail.mockRejectedValue(
      new EmailDeliveryNotConfiguredError(),
    );

    const response = await post();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Email delivery is not configured, so this message cannot be sent.",
    });
  });

  it("returns 502 when send fails", async () => {
    verifyRequest.mockResolvedValue({
      ok: true,
      decoded: { email: "alex@example.com", email_verified: false },
      token: "tok",
    });
    sendVerificationEmail.mockRejectedValue(new Error("resend down"));

    const response = await post();
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Could not send a verification email. Please try again.",
    });
  });

  it("rate-limits repeat requests", async () => {
    rateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
      limit: 8,
    });

    const response = await post();
    expect(response.status).toBe(429);
    expect(verifyRequest).not.toHaveBeenCalled();
  });
});
