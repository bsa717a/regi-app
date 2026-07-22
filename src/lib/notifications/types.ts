export type NotificationDto = {
  id: string;
  userId: string;
  vehicleId: string | null;
  channel: "push" | "email" | "sms";
  templateKey: string;
  title: string;
  vehicleLabel: string | null;
  scheduledFor: string;
  sentAt: string | null;
  status: "pending" | "sent" | "failed" | "cancelled";
  createdAt: string;
};
