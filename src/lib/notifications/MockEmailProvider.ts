import type { EmailMessage, EmailProvider } from "./EmailProvider";

/** Default email provider for local/dev — logs instead of sending. */
export class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info("[MockEmailProvider] send", {
      to: message.to,
      subject: message.subject,
      text: message.text,
      htmlLength: message.html.length,
    });
  }
}
