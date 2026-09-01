import type { EmailMessage, EmailProvider } from "./EmailProvider";

export type AzureMailConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string;
  fromName?: string;
};

type FetchFn = typeof fetch;

/**
 * Microsoft Graph mail — same path as 4StudentLives (`azureEmailService`).
 * Uses client-credentials + `/users/{sender}/sendMail`.
 */
export class AzureMailEmailProvider implements EmailProvider {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly sender: string;
  private readonly fromName: string;
  private readonly fetchFn: FetchFn;
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(deps: AzureMailConfig & { fetchFn?: FetchFn }) {
    this.tenantId = deps.tenantId;
    this.clientId = deps.clientId;
    this.clientSecret = deps.clientSecret;
    this.sender = deps.sender;
    this.fromName = deps.fromName?.trim() || "REGI";
    this.fetchFn = deps.fetchFn ?? fetch;
  }

  async send(message: EmailMessage): Promise<void> {
    const token = await this.getAccessToken();
    const response = await this.fetchFn(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(this.sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: message.subject,
            body: {
              contentType: "HTML",
              content: message.html,
            },
            toRecipients: [
              { emailAddress: { address: message.to } },
            ],
            from: {
              emailAddress: {
                address: this.sender,
                name: this.fromName,
              },
            },
          },
          saveToSentItems: false,
        }),
      },
    );

    if (!response.ok) {
      const detail = await readGraphError(response);
      throw new Error(`Azure Mail send failed (${response.status}): ${detail}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    const response = await this.fetchFn(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Azure Mail token request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      throw new Error("Azure Mail token response was missing access_token");
    }

    const lifetimeMs = Math.max((payload.expires_in ?? 3600) - 60, 60) * 1000;
    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + lifetimeMs;
    return this.accessToken;
  }
}

export function azureMailConfigFromEnv(
  env: NodeJS.ProcessEnv,
): AzureMailConfig | null {
  const fromJson = parseAzureMailJson(env.AZURE_MAIL_JSON);
  const tenantId =
    env.AZURE_MAIL_TENANT_ID?.trim() || fromJson?.tenantId || "";
  const clientId =
    env.AZURE_MAIL_CLIENT_ID?.trim() || fromJson?.clientId || "";
  const clientSecret =
    env.AZURE_MAIL_CLIENT_SECRET?.trim() || fromJson?.clientSecret || "";
  const sender = env.AZURE_MAIL_SENDER?.trim() || fromJson?.sender || "";
  const fromName =
    env.AZURE_MAIL_FROM_NAME?.trim() || fromJson?.fromName || "REGI";

  if (!tenantId || !clientId || !clientSecret || !sender) {
    return null;
  }

  return { tenantId, clientId, clientSecret, sender, fromName };
}

function parseAzureMailJson(raw: string | undefined): AzureMailConfig | null {
  const text = raw?.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const tenantId = stringField(parsed, "AZURE_MAIL_TENANT_ID", "tenantId");
    const clientId = stringField(parsed, "AZURE_MAIL_CLIENT_ID", "clientId");
    const clientSecret = stringField(
      parsed,
      "AZURE_MAIL_CLIENT_SECRET",
      "clientSecret",
    );
    const sender = stringField(parsed, "AZURE_MAIL_SENDER", "sender");
    const fromName = stringField(parsed, "AZURE_MAIL_FROM_NAME", "fromName");
    if (!tenantId || !clientId || !clientSecret || !sender) return null;
    return { tenantId, clientId, clientSecret, sender, fromName };
  } catch {
    return null;
  }
}

function stringField(
  parsed: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

async function readGraphError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    return payload.error?.message || response.statusText || "unknown error";
  } catch {
    return response.statusText || "unknown error";
  }
}
