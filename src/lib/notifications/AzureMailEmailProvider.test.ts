import { describe, expect, it, vi } from "vitest";
import {
  AzureMailEmailProvider,
  azureMailConfigFromEnv,
} from "./AzureMailEmailProvider";
import { MockEmailProvider } from "./MockEmailProvider";
import { createEmailProviderFromEnv } from "./SendGridEmailProvider";

describe("azureMailConfigFromEnv", () => {
  it("reads individual env vars", () => {
    expect(
      azureMailConfigFromEnv({
        AZURE_MAIL_TENANT_ID: " tenant ",
        AZURE_MAIL_CLIENT_ID: "client",
        AZURE_MAIL_CLIENT_SECRET: "secret",
        AZURE_MAIL_SENDER: "noreply@4studentlives.com",
      }),
    ).toEqual({
      tenantId: "tenant",
      clientId: "client",
      clientSecret: "secret",
      sender: "noreply@4studentlives.com",
      fromName: "REGI",
    });
  });

  it("reads AZURE_MAIL_JSON when individual vars are missing", () => {
    expect(
      azureMailConfigFromEnv({
        AZURE_MAIL_JSON: JSON.stringify({
          AZURE_MAIL_TENANT_ID: "tenant",
          AZURE_MAIL_CLIENT_ID: "client",
          AZURE_MAIL_CLIENT_SECRET: "secret",
          AZURE_MAIL_SENDER: "noreply@4studentlives.com",
        }),
      }),
    ).toMatchObject({
      tenantId: "tenant",
      sender: "noreply@4studentlives.com",
    });
  });
});

describe("AzureMailEmailProvider", () => {
  it("requests a token then posts sendMail", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oauth2/v2.0/token")) {
        return new Response(
          JSON.stringify({ access_token: "tok", expires_in: 3600 }),
          { status: 200 },
        );
      }
      if (url.includes("/sendMail")) {
        return new Response(null, { status: 202 });
      }
      return new Response("not found", { status: 404 });
    });

    const provider = new AzureMailEmailProvider({
      tenantId: "tenant",
      clientId: "client",
      clientSecret: "secret",
      sender: "noreply@4studentlives.com",
      fromName: "REGI",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await provider.send({
      to: "alex@example.com",
      subject: "Confirm your email for REGI",
      html: "<p>Verify</p>",
      text: "Verify",
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const sendUrl = String(fetchFn.mock.calls[1][0]);
    expect(sendUrl).toContain(
      "/users/noreply%404studentlives.com/sendMail",
    );
    const sendInit = fetchFn.mock.calls[1][1] as RequestInit;
    expect(sendInit.headers).toMatchObject({
      Authorization: "Bearer tok",
    });
    const body = JSON.parse(String(sendInit.body)) as {
      message: { subject: string; toRecipients: { emailAddress: { address: string } }[] };
      saveToSentItems: boolean;
    };
    expect(body.message.subject).toContain("Confirm");
    expect(body.message.toRecipients[0].emailAddress.address).toBe(
      "alex@example.com",
    );
    expect(body.saveToSentItems).toBe(false);
  });
});

describe("createEmailProviderFromEnv azure", () => {
  it("builds AzureMailEmailProvider when configured", () => {
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "azure",
      AZURE_MAIL_TENANT_ID: "tenant",
      AZURE_MAIL_CLIENT_ID: "client",
      AZURE_MAIL_CLIENT_SECRET: "secret",
      AZURE_MAIL_SENDER: "noreply@4studentlives.com",
    });
    expect(provider).toBeInstanceOf(AzureMailEmailProvider);
  });

  it("falls back to mock when azure is selected but unconfigured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const provider = createEmailProviderFromEnv({
      NOTIFICATION_EMAIL_PROVIDER: "azure",
    });
    expect(provider).toBeInstanceOf(MockEmailProvider);
    warn.mockRestore();
  });
});
