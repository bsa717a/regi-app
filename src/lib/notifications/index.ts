import { prisma } from "@/lib/prisma";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
} from "@/lib/auth/notificationPrefs";
import { listPushTokensForUser } from "@/lib/push/tokens";
import { DefaultNotificationService } from "./DefaultNotificationService";
import { createFcmPushProvider } from "./FcmPushProvider";
import { MockEmailProvider } from "./MockEmailProvider";
import { MockNotificationService } from "./MockNotificationService";
import { NoOpPushProvider } from "./NoOpPushProvider";
import { createEmailProviderFromEnv } from "./SendGridEmailProvider";
import type { EmailProvider } from "./EmailProvider";
import type { NotificationService } from "./NotificationService";
import type { PushProvider } from "./PushProvider";

export type { EmailMessage, EmailProvider } from "./EmailProvider";
export type {
  NotificationChannel,
  NotificationPayload,
  NotificationService,
} from "./NotificationService";
export type { PushMessage, PushProvider } from "./PushProvider";
export { MockEmailProvider } from "./MockEmailProvider";
export { MockNotificationService } from "./MockNotificationService";
export { DefaultNotificationService } from "./DefaultNotificationService";
export { NoOpPushProvider } from "./NoOpPushProvider";
export { FcmPushProvider, createFcmPushProvider } from "./FcmPushProvider";
export {
  SendGridEmailProvider,
  createEmailProviderFromEnv,
} from "./SendGridEmailProvider";
export {
  formatTemplate,
  formatNotificationTitle,
} from "./formatTemplate";
export {
  getNotificationTemplate,
  listNotificationTemplateKeys,
  reminderTemplateKeyForDays,
  renderNotificationTemplate,
  toneForDaysUntil,
} from "./templates";
export type { NotificationTemplate, TemplateTone } from "./templates";

function createEmailProvider(): EmailProvider {
  return createEmailProviderFromEnv();
}

function createPushProvider(): PushProvider {
  // Prefer real FCM; Admin SDK send no-ops gracefully when tokens missing / errors.
  // NOTIFICATION_PUSH_PROVIDER=noop forces the scaffold no-op (tests / local).
  if (process.env.NOTIFICATION_PUSH_PROVIDER === "noop") {
    return new NoOpPushProvider();
  }
  return createFcmPushProvider();
}

/** Default factory — email from env; push via FCM Admin (or noop when forced). */
export function createNotificationService(): NotificationService {
  return new DefaultNotificationService({
    emailProvider: createEmailProvider(),
    pushProvider: createPushProvider(),
    resolveUser: async (userId) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, notificationPrefs: true },
      });
      if (!user) return null;
      const fcmTokens = await listPushTokensForUser(userId);
      return {
        email: user.email,
        fcmTokens,
        prefs: parseNotificationPrefs(user.notificationPrefs),
      };
    },
  });
}

/** Scaffold-era mock (logs; SMS throws). Prefer createNotificationService(). */
export function createMockNotificationService(): NotificationService {
  return new MockNotificationService(new MockEmailProvider());
}

export { DEFAULT_NOTIFICATION_PREFS };
