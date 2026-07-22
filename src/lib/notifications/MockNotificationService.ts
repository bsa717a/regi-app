import type { EmailProvider } from "./EmailProvider";
import type {
  NotificationPayload,
  NotificationService,
} from "./NotificationService";

/**
 * Scaffold notification sender.
 * - push / email: logged (email via EmailProvider)
 * - sms: throws — Twilio lands in Phase 2
 */
export class MockNotificationService implements NotificationService {
  constructor(private readonly emailProvider: EmailProvider) {}

  async send(payload: NotificationPayload): Promise<void> {
    switch (payload.channel) {
      case "push":
        console.info("[MockNotificationService] push", payload);
        return;
      case "email":
        console.info("[MockNotificationService] email", payload);
        await this.emailProvider.send({
          to: payload.to ?? "unknown@example.com",
          subject: `[REGI] ${payload.templateKey}`,
          html: `<pre>${JSON.stringify(payload.variables ?? {}, null, 2)}</pre>`,
          text: JSON.stringify(payload.variables ?? {}),
        });
        return;
      case "sms":
        throw new Error("not implemented (Phase 2)");
      default: {
        const _exhaustive: never = payload.channel;
        throw new Error(`Unsupported channel: ${_exhaustive}`);
      }
    }
  }
}
