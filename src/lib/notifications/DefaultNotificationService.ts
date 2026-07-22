import type { NotificationPrefs } from "@/lib/auth/notificationPrefs";
import type { EmailProvider } from "./EmailProvider";
import type {
  NotificationPayload,
  NotificationService,
} from "./NotificationService";
import type { PushProvider } from "./PushProvider";
import { renderNotificationTemplate } from "./templates";

export type DefaultNotificationServiceDeps = {
  emailProvider: EmailProvider;
  pushProvider: PushProvider;
  /**
   * Resolve destination + prefs for a userId.
   * Cron tick injects DB-backed lookup; tests inject fixtures.
   */
  resolveUser: (userId: string) => Promise<{
    email: string | null;
    /** Registered FCM device tokens for multicast push. */
    fcmTokens?: string[];
    /** @deprecated Prefer fcmTokens — kept for older test fixtures. */
    fcmToken?: string | null;
    prefs: NotificationPrefs;
  } | null>;
};

/**
 * Production notification sender:
 * - email via EmailProvider (mock or SendGrid)
 * - push via PushProvider (FCM web push / no-op when unconfigured)
 * - sms always skipped (Phase 2)
 * Respects per-account notification_prefs before sending.
 */
export class DefaultNotificationService implements NotificationService {
  constructor(private readonly deps: DefaultNotificationServiceDeps) {}

  async send(payload: NotificationPayload): Promise<void> {
    if (payload.channel === "sms") {
      // SMS is modeled only (Phase 2) — never send.
      return;
    }

    const user = await this.deps.resolveUser(payload.userId);
    if (!user) {
      throw new Error(`User not found for notification: ${payload.userId}`);
    }

    // Household invites are transactional — always send when an explicit `to` is set.
    const transactionalInvite =
      payload.templateKey === "household_invite" && Boolean(payload.to);

    if (!transactionalInvite && !user.prefs[payload.channel]) {
      return;
    }

    const rendered = renderNotificationTemplate(
      payload.templateKey,
      payload.variables ?? {},
    );

    if (payload.channel === "email") {
      const to = payload.to ?? user.email;
      if (!to) {
        throw new Error(`No email address for user ${payload.userId}`);
      }
      await this.deps.emailProvider.send({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      return;
    }

    if (payload.channel === "push") {
      const tokensFromUser =
        user.fcmTokens ??
        (user.fcmToken ? [user.fcmToken] : undefined);

      await this.deps.pushProvider.send({
        userId: payload.userId,
        token: payload.to,
        tokens: payload.to ? undefined : tokensFromUser,
        title: rendered.subject,
        body: rendered.text,
        data: {
          templateKey: payload.templateKey,
          userId: payload.userId,
        },
      });
      return;
    }

    const _exhaustive: never = payload.channel;
    throw new Error(`Unsupported channel: ${_exhaustive}`);
  }
}
