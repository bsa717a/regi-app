import sgMail from "@sendgrid/mail";
import type { EmailMessage, EmailProvider } from "./EmailProvider";
import { MockEmailProvider } from "./MockEmailProvider";

type SendGridClient = {
  setApiKey: (key: string) => void;
  send: (msg: {
    to: string;
    from: { email: string; name?: string } | string;
    subject: string;
    text?: string;
    html: string;
  }) => Promise<unknown>;
};

/**
 * SendGrid transactional email. Only constructed when
 * NOTIFICATION_EMAIL_PROVIDER=sendgrid and SENDGRID_API_KEY is set.
 * Factory falls back to MockEmailProvider when unconfigured.
 */
export class SendGridEmailProvider implements EmailProvider {
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly mail: SendGridClient;

  constructor(deps: {
    apiKey: string;
    fromEmail: string;
    fromName?: string;
    /** Injectable for tests. */
    mail?: SendGridClient;
  }) {
    this.fromEmail = deps.fromEmail;
    this.fromName = deps.fromName?.trim() || "REGI";
    this.mail = deps.mail ?? (sgMail as unknown as SendGridClient);
    this.mail.setApiKey(deps.apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    await this.mail.send({
      to: message.to,
      from: { email: this.fromEmail, name: this.fromName },
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

/**
 * Build the email provider for the process env.
 * Never throws on misconfiguration — falls back to mock + warn.
 */
export function createEmailProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): EmailProvider {
  const provider = (env.NOTIFICATION_EMAIL_PROVIDER ?? "mock").toLowerCase();

  if (provider === "mock") {
    return new MockEmailProvider();
  }

  if (provider === "sendgrid") {
    const apiKey = env.SENDGRID_API_KEY?.trim();
    const fromEmail = env.SENDGRID_FROM_EMAIL?.trim();
    if (!apiKey || !fromEmail) {
      console.warn(
        "[notifications] NOTIFICATION_EMAIL_PROVIDER=sendgrid but SENDGRID_API_KEY / SENDGRID_FROM_EMAIL missing — using mock",
      );
      return new MockEmailProvider();
    }
    try {
      return new SendGridEmailProvider({
        apiKey,
        fromEmail,
        fromName: env.SENDGRID_FROM_NAME,
      });
    } catch (err) {
      console.warn(
        "[notifications] Failed to init SendGrid — using mock",
        err,
      );
      return new MockEmailProvider();
    }
  }

  console.warn(
    `Unknown NOTIFICATION_EMAIL_PROVIDER="${provider}", using mock`,
  );
  return new MockEmailProvider();
}
