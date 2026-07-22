import { describe, expect, it, vi } from "vitest";
import { MockEmailProvider } from "./MockEmailProvider";
import {
  createEmailProviderFromEnv,
  SendGridEmailProvider,
} from "./SendGridEmailProvider";

describe("createEmailProviderFromEnv", () => {
  it("defaults to mock", () => {
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "mock",
    });
    expect(provider).toBeInstanceOf(MockEmailProvider);
  });

  it("falls back to mock when sendgrid is selected but unconfigured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "sendgrid",
    });
    expect(provider).toBeInstanceOf(MockEmailProvider);
    warn.mockRestore();
  });

  it("builds SendGridEmailProvider when configured", async () => {
    const mail = {
      setApiKey: vi.fn(),
      send: vi.fn(async () => [{}]),
    };
    const provider = new SendGridEmailProvider({
      apiKey: "sg-key",
      fromEmail: "noreply@regi.app",
      fromName: "REGI",
      mail,
    });
    await provider.send({
      to: "a@b.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
    });
    expect(mail.setApiKey).toHaveBeenCalledWith("sg-key");
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@b.com",
        subject: "Hi",
      }),
    );
  });
});
