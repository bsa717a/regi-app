import { describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "./MockEmailProvider";
import {
  ResendEmailProvider,
  resendMailConfigFromEnv,
} from "./ResendEmailProvider";
import { createEmailProviderFromEnv } from "./SendGridEmailProvider";

describe("resendMailConfigFromEnv", () => {
  it("returns null without an API key", () => {
    expect(resendMailConfigFromEnv({ RESEND_FROM_EMAIL: "a@b.com" })).toBeNull();
  });

  it("defaults from address and name", () => {
    expect(
      resendMailConfigFromEnv({
        RESEND_API_KEY: " re_test ",
      }),
    ).toEqual({
      apiKey: "re_test",
      fromEmail: "noreply@regireg.com",
      fromName: "REGI",
    });
  });

  it("reads explicit from env vars", () => {
    expect(
      resendMailConfigFromEnv({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: " alerts@regireg.com ",
        RESEND_FROM_NAME: " REGI Alerts ",
      }),
    ).toEqual({
      apiKey: "re_test",
      fromEmail: "alerts@regireg.com",
      fromName: "REGI Alerts",
    });
  });
});

describe("ResendEmailProvider", () => {
  it("posts to Resend with bearer auth and from header", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));

    const provider = new ResendEmailProvider({
      apiKey: "re_test",
      fromEmail: "noreply@regireg.com",
      fromName: "REGI",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await provider.send({
      to: "alex@example.com",
      subject: "Confirm your email for REGI",
      html: "<p>Verify</p>",
      text: "Verify",
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String(fetchFn.mock.calls[0][0])).toBe("https://api.resend.com/emails");
    const init = fetchFn.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      from: "REGI <noreply@regireg.com>",
      to: ["alex@example.com"],
      subject: "Confirm your email for REGI",
      html: "<p>Verify</p>",
      text: "Verify",
    });
  });

  it("throws when Resend returns an error", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "domain not verified" }), {
          status: 403,
        }),
    );
    const provider = new ResendEmailProvider({
      apiKey: "re_test",
      fromEmail: "noreply@regireg.com",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await expect(
      provider.send({
        to: "alex@example.com",
        subject: "Hi",
        html: "<p>Hi</p>",
      }),
    ).rejects.toThrow(/Resend send failed \(403\): domain not verified/);
  });
});

describe("createEmailProviderFromEnv resend", () => {
  it("builds ResendEmailProvider when configured", () => {
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "noreply@regireg.com",
    });
    expect(provider).toBeInstanceOf(ResendEmailProvider);
  });

  it("falls back to mock when resend is selected but unconfigured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "resend",
    });
    expect(provider).toBeInstanceOf(MockEmailProvider);
    warn.mockRestore();
  });
});
