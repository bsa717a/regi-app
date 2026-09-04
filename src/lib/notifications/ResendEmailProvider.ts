import type { EmailMessage, EmailProvider } from "./EmailProvider";

export type ResendMailConfig = {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
};

type FetchFn = typeof fetch;

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "noreply@regireg.com";
const DEFAULT_FROM_NAME = "REGI";

/**
 * Resend transactional email. Only constructed when
 * NOTIFICATION_EMAIL_PROVIDER=resend and RESEND_API_KEY is set.
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly fetchFn: FetchFn;

  constructor(deps: ResendMailConfig & { fetchFn?: FetchFn }) {
    this.apiKey = deps.apiKey;
    this.fromEmail = deps.fromEmail;
    this.fromName = deps.fromName?.trim() || DEFAULT_FROM_NAME;
    this.fetchFn = deps.fetchFn ?? fetch;
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await this.fetchFn(RESEND_EMAILS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await readResendError(response);
      throw new Error(`Resend send failed (${response.status}): ${detail}`);
    }
  }
}

export function resendMailConfigFromEnv(
  env: NodeJS.ProcessEnv,
): ResendMailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    fromEmail: env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
    fromName: env.RESEND_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
  };
}

async function readResendError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string;
      name?: string;
    };
    return payload.message || payload.name || response.statusText || "unknown error";
  } catch {
    return response.statusText || "unknown error";
  }
}
