import { daysUntilExpiration } from "@/lib/stateEngine/status";
import type { ReminderSchedule } from "@/lib/stateEngine/types";
import { buildReminderDedupeKey } from "./dedupe";
import { startOfUtcDay } from "./dates";
import type {
  PlannedNotification,
  PlanRemindersOptions,
  ReminderRegistrationInput,
  ReminderTemplateVariables,
} from "./types";

const DEFAULT_CHANNELS: Array<"email" | "push"> = ["email", "push"];

/** Template key for a pre-expiration offset (from state_rules.config). */
export function preExpirationTemplateKey(daysBefore: number): string {
  return `reminder_${daysBefore}`;
}

/** Template key for a post-expiration escalated reminder. */
export function postExpirationTemplateKey(): string {
  return "post_expiration";
}

function registrationDisplayName(registration: ReminderRegistrationInput): string {
  if (registration.nickname?.trim()) return registration.nickname.trim();
  const parts = [registration.year, registration.make, registration.model]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== "")
    .join(" ");
  return parts || "your vehicle";
}

function buildVariables(
  registration: ReminderRegistrationInput,
  daysUntil: number,
): ReminderTemplateVariables {
  return {
    vehicleName: registrationDisplayName(registration),
    daysLeft: Math.max(daysUntil, 0),
    daysAfter: daysUntil < 0 ? Math.abs(daysUntil) : 0,
    year: registration.year != null ? String(registration.year) : "",
    make: registration.make?.trim() ?? "",
    model: registration.model?.trim() ?? "",
  };
}

/**
 * Decide whether today's tick should fire a reminder for this registration,
 * using ONLY the offsets / cadence from `schedule` (state_rules.config).
 *
 * Returns the template key when a reminder is due today, else null.
 */
export function matchReminderForToday(
  daysUntil: number,
  schedule: ReminderSchedule,
): { templateKey: string } | null {
  const daysBefore = schedule.daysBeforeExpiration ?? [];

  if (daysUntil >= 0 && daysBefore.includes(daysUntil)) {
    return { templateKey: preExpirationTemplateKey(daysUntil) };
  }

  if (daysUntil < 0) {
    const daysAfter = Math.abs(daysUntil);
    const interval = schedule.postExpiration?.intervalDays;
    if (
      typeof interval !== "number" ||
      !Number.isFinite(interval) ||
      interval <= 0
    ) {
      return null;
    }

    // Fire on day interval, 2*interval, … (not on the expiration day itself).
    if (daysAfter % interval !== 0) return null;

    const ordinal = daysAfter / interval;
    const max = schedule.postExpiration.maxReminders;
    if (typeof max === "number" && Number.isFinite(max) && ordinal > max) {
      return null;
    }

    return { templateKey: postExpirationTemplateKey() };
  }

  return null;
}

/**
 * Pure planner: given registrations + state reminderSchedule + today,
 * return the notification rows that should exist (idempotent via dedupeKey).
 *
 * Calling twice with the same inputs returns identical planned rows.
 */
export function planRemindersForRegistrations(
  registrations: ReminderRegistrationInput[],
  options: PlanRemindersOptions,
): PlannedNotification[] {
  const asOf = startOfUtcDay(options.asOf);
  const channels = options.channels ?? DEFAULT_CHANNELS;
  const planned: PlannedNotification[] = [];

  for (const registration of registrations) {
    if (!registration.recipientUserIds.length) continue;

    const daysUntil = daysUntilExpiration(
      registration.registrationExpiresOn,
      asOf,
    );
    const match = matchReminderForToday(daysUntil, options.schedule);
    if (!match) continue;

    const variables = buildVariables(registration, daysUntil);
    const scheduledFor = asOf;

    for (const userId of registration.recipientUserIds) {
      for (const channel of channels) {
        planned.push({
          userId,
          registrationId: registration.id,
          channel,
          templateKey: match.templateKey,
          scheduledFor,
          dedupeKey: buildReminderDedupeKey({
            registrationId: registration.id,
            userId,
            channel,
            templateKey: match.templateKey,
            scheduledFor,
          }),
          daysUntilExpiration: daysUntil,
          variables,
        });
      }
    }
  }

  return planned;
}

/**
 * Stable unique list of dedupe keys — used by tests to prove re-runs are identical.
 */
export function plannedDedupeKeys(planned: PlannedNotification[]): string[] {
  return [...new Set(planned.map((p) => p.dedupeKey))].sort();
}
