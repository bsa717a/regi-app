export type NotificationDto = {
  id: string;
  userId: string;
  registrationId: string | null;
  channel: "push" | "email" | "sms";
  templateKey: string;
  title: string;
  registrationLabel: string | null;
  scheduledFor: string;
  sentAt: string | null;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: string;
};
