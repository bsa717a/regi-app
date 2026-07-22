import type { PrismaClient } from "@prisma/client";
import { parseNotificationPrefs } from "@/lib/auth/notificationPrefs";
import type { NotificationService } from "@/lib/notifications/NotificationService";
import { parseStateRulesConfig } from "@/lib/stateEngine/parseConfig";
import { daysUntilExpiration } from "@/lib/stateEngine/status";
import type { ReminderSchedule, StateRulesConfig } from "@/lib/stateEngine/types";
import { startOfUtcDay } from "./dates";
import { planRemindersForVehicles } from "./schedule";
import type { PlannedNotification, ReminderVehicleInput } from "./types";

export type ReminderTickResult = {
  asOf: string;
  vehiclesEvaluated: number;
  planned: number;
  upserted: number;
  skippedDuplicate: number;
  dispatched: number;
  sent: number;
  failed: number;
  skippedByPrefs: number;
  errors: string[];
};

export type ReminderTickDeps = {
  db: PrismaClient;
  notificationService: NotificationService;
  asOf?: Date;
};

function defaultScheduleFallback(): ReminderSchedule {
  // Only used if a vehicle's state_rules row is missing/unparseable.
  // Prefer state_rules.config in all normal paths.
  return {
    daysBeforeExpiration: [90, 60, 30, 14, 7, 3, 0],
    postExpiration: { intervalDays: 3, maxReminders: 10 },
  };
}

function scheduleFromConfig(config: StateRulesConfig | null): ReminderSchedule {
  if (!config?.reminderSchedule) return defaultScheduleFallback();
  return config.reminderSchedule;
}

/**
 * Daily reminder job:
 * 1) Evaluate all vehicles against state_rules reminderSchedule
 * 2) Upsert due notification rows idempotently (dedupe_key)
 * 3) Dispatch pending rows that are due now (respect notification_prefs)
 * 4) Record per-row success/failure without aborting the whole run
 */
export async function runReminderTick(
  deps: ReminderTickDeps,
): Promise<ReminderTickResult> {
  const asOf = startOfUtcDay(deps.asOf ?? new Date());
  const errors: string[] = [];
  let upserted = 0;
  let skippedDuplicate = 0;
  let dispatched = 0;
  let sent = 0;
  let failed = 0;
  let skippedByPrefs = 0;

  const [vehicles, stateRules] = await Promise.all([
    deps.db.vehicle.findMany({
      select: {
        id: true,
        state: true,
        registrationExpiresOn: true,
        nickname: true,
        year: true,
        make: true,
        model: true,
        createdBy: true,
        household: {
          select: {
            members: {
              where: { inviteStatus: "accepted" },
              select: { userId: true },
            },
          },
        },
      },
    }),
    deps.db.stateRule.findMany({
      where: { active: true },
      select: { stateCode: true, config: true },
    }),
  ]);

  const configByState = new Map<string, StateRulesConfig | null>();
  for (const row of stateRules) {
    configByState.set(row.stateCode, parseStateRulesConfig(row.config));
  }

  // Group vehicles by state so each batch uses that state's reminderSchedule.
  const byState = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const list = byState.get(v.state) ?? [];
    list.push(v);
    byState.set(v.state, list);
  }

  const allPlanned: PlannedNotification[] = [];

  for (const [state, stateVehicles] of byState) {
    const schedule = scheduleFromConfig(configByState.get(state) ?? null);
    const inputs: ReminderVehicleInput[] = stateVehicles.map((v) => {
      const memberIds = v.household.members
        .map((m) => m.userId)
        .filter((id): id is string => Boolean(id));
      const recipients = memberIds.length > 0 ? memberIds : [v.createdBy];
      return {
        id: v.id,
        registrationExpiresOn: v.registrationExpiresOn,
        recipientUserIds: [...new Set(recipients)],
        nickname: v.nickname,
        year: v.year,
        make: v.make,
        model: v.model,
      };
    });

    allPlanned.push(
      ...planRemindersForVehicles(inputs, { schedule, asOf }),
    );
  }

  // Upsert planned rows (idempotent via dedupeKey unique).
  for (const planned of allPlanned) {
    try {
      const existing = await deps.db.notification.findUnique({
        where: { dedupeKey: planned.dedupeKey },
        select: { id: true },
      });
      if (existing) {
        skippedDuplicate += 1;
        continue;
      }

      await deps.db.notification.create({
        data: {
          userId: planned.userId,
          vehicleId: planned.vehicleId,
          channel: planned.channel,
          templateKey: planned.templateKey,
          scheduledFor: planned.scheduledFor,
          status: "pending",
          dedupeKey: planned.dedupeKey,
        },
      });
      upserted += 1;
    } catch (err) {
      // Unique race: treat as duplicate, keep going.
      const message = err instanceof Error ? err.message : String(err);
      if (/unique|dedupe/i.test(message)) {
        skippedDuplicate += 1;
      } else {
        errors.push(`upsert ${planned.dedupeKey}: ${message}`);
      }
    }
  }

  // Dispatch due pending notifications (scheduled_for <= end of today UTC).
  const due = await deps.db.notification.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: asOf },
      channel: { in: ["email", "push"] },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          notificationPrefs: true,
        },
      },
      vehicle: {
        select: {
          nickname: true,
          year: true,
          make: true,
          model: true,
          registrationExpiresOn: true,
        },
      },
    },
  });

  for (const row of due) {
    dispatched += 1;
    const prefs = parseNotificationPrefs(row.user.notificationPrefs);

    if (row.channel === "sms" || !prefs[row.channel]) {
      skippedByPrefs += 1;
      // Cancel when the channel is disabled so we don't retry forever.
      try {
        await deps.db.notification.update({
          where: { id: row.id },
          data: { status: "cancelled" },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`cancel ${row.id}: ${message}`);
      }
      continue;
    }

    const vehicleName =
      row.vehicle?.nickname?.trim() ||
      [row.vehicle?.year, row.vehicle?.make, row.vehicle?.model]
        .filter(Boolean)
        .join(" ") ||
      "your vehicle";

    const daysUntil = row.vehicle?.registrationExpiresOn
      ? daysUntilExpiration(row.vehicle.registrationExpiresOn, asOf)
      : 0;

    const variables: Record<string, string | number | boolean> = {
      vehicleName,
      daysLeft: Math.max(daysUntil, 0),
      daysAfter: daysUntil < 0 ? Math.abs(daysUntil) : 0,
      year: row.vehicle?.year != null ? String(row.vehicle.year) : "",
      make: row.vehicle?.make ?? "",
      model: row.vehicle?.model ?? "",
    };

    const plannedMatch = allPlanned.find((p) => p.dedupeKey === row.dedupeKey);
    if (plannedMatch) {
      variables.daysLeft = plannedMatch.variables.daysLeft;
      variables.daysAfter = plannedMatch.variables.daysAfter;
      variables.vehicleName = plannedMatch.variables.vehicleName;
    }

    try {
      await deps.notificationService.send({
        userId: row.userId,
        channel: row.channel,
        templateKey: row.templateKey,
        variables,
        to: row.channel === "email" ? row.user.email : undefined,
      });

      await deps.db.notification.update({
        where: { id: row.id },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });
      sent += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`send ${row.id}: ${message}`);
      try {
        await deps.db.notification.update({
          where: { id: row.id },
          data: { status: "failed" },
        });
      } catch (updateErr) {
        const um =
          updateErr instanceof Error ? updateErr.message : String(updateErr);
        errors.push(`fail-mark ${row.id}: ${um}`);
      }
    }
  }

  return {
    asOf: asOf.toISOString(),
    vehiclesEvaluated: vehicles.length,
    planned: allPlanned.length,
    upserted,
    skippedDuplicate,
    dispatched,
    sent,
    failed,
    skippedByPrefs,
    errors,
  };
}
