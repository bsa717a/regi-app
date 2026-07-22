import type { EmailProvider } from "./EmailProvider";
import type { PushProvider } from "./PushProvider";

export type NotificationChannel = "push" | "email" | "sms";

export type NotificationPayload = {
  userId: string;
  channel: NotificationChannel;
  templateKey: string;
  variables?: Record<string, string | number | boolean>;
  /** Destination override (email address, FCM token, or phone). */
  to?: string;
};

export interface NotificationService {
  send(payload: NotificationPayload): Promise<void>;
}

export type NotificationServiceDeps = {
  emailProvider: EmailProvider;
  pushProvider?: PushProvider;
};
