import type { NotificationChannel } from "@prisma/client";
import type { ReminderSchedule } from "@/lib/stateEngine/types";

/** Input shape for pure reminder planning (no Prisma types required). */
export type ReminderVehicleInput = {
  id: string;
  registrationExpiresOn: Date | string;
  /** Users who should receive reminders (accepted household members). */
  recipientUserIds: string[];
  nickname?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
};

/** One notification row that should exist after the daily tick. */
export type PlannedNotification = {
  userId: string;
  vehicleId: string;
  channel: NotificationChannel;
  templateKey: string;
  scheduledFor: Date;
  /** Idempotency key: vehicleId:userId:channel:templateKey:YYYY-MM-DD */
  dedupeKey: string;
  daysUntilExpiration: number;
  variables: ReminderTemplateVariables;
};

export type ReminderTemplateVariables = {
  vehicleName: string;
  daysLeft: number;
  daysAfter: number;
  year: string;
  make: string;
  model: string;
};

export type PlanRemindersOptions = {
  schedule: ReminderSchedule;
  /** Calendar "today" (UTC date parts used). */
  asOf: Date;
  /** Channels to materialize rows for (SMS never included in MVP). */
  channels?: Array<"email" | "push">;
};
