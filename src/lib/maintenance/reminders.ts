import type { NotificationChannel, PrismaClient } from "@prisma/client";
import { startOfUtcDay } from "@/lib/reminders/dates";
import { vehicleDisplayName } from "./access";
import { computeTaskStatus, isUsageStale } from "./status";
import { isoDayFromDate } from "./validation";

const STALE_USAGE_DAYS = 60;

export type MaintenanceReminderVariables = {
  vehicleName: string;
  daysLeft: number;
  daysAfter: number;
  year: string;
  make: string;
  model: string;
  taskName?: string;
  statusDetail?: string;
  maintenanceUrl?: string;
};

export type MaintenancePlannedNotification = {
  userId: string;
  registrationId: string;
  channel: NotificationChannel;
  templateKey: string;
  scheduledFor: Date;
  dedupeKey: string;
  daysUntilExpiration: number;
  variables: MaintenanceReminderVariables;
  /** Present for one-shot scheduled reminders that should clear remindOn after upsert. */
  taskId?: string;
};

export type MaintenanceReminderPlanResult = {
  planned: MaintenancePlannedNotification[];
  registrationsEvaluated: number;
  tasksEvaluated: number;
  /** Task IDs whose one-shot remindOn fired and should be cleared. */
  clearRemindOnTaskIds: string[];
};

function appOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:8080";
}

function dedupeKey(
  registrationId: string,
  userId: string,
  channel: "email" | "push",
  templateKey: string,
  day: string,
  taskId?: string,
): string {
  const taskPart = taskId ? `:${taskId}` : "";
  return `${registrationId}:${userId}:${channel}:${templateKey}${taskPart}:${day}`;
}

/**
 * Plan maintenance notifications for the daily cron tick.
 * - One-shot remindOn → maintenance_scheduled (then clear remindOn)
 * - Due / overdue tasks → maintenance_due / maintenance_overdue
 * - Hour/mile tasks with stale usage → maintenance_usage_nudge (instead of claiming due)
 */
export async function planMaintenanceReminders(
  db: PrismaClient,
  asOfInput: Date = new Date(),
): Promise<MaintenanceReminderPlanResult> {
  const asOf = startOfUtcDay(asOfInput);
  const day = isoDayFromDate(asOf);
  const origin = appOrigin();

  const registrations = await db.registration.findMany({
    select: {
      id: true,
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
      maintenanceTasks: {
        where: { active: true },
      },
      usageReadings: {
        orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
      maintenanceLogs: {
        where: { taskId: { not: null } },
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  const planned: MaintenancePlannedNotification[] = [];
  const clearRemindOnTaskIds: string[] = [];
  let tasksEvaluated = 0;

  for (const registration of registrations) {
    const tasks = registration.maintenanceTasks ?? [];
    if (tasks.length === 0) continue;

    const memberIds = (registration.household?.members ?? [])
      .map((m) => m.userId)
      .filter((id): id is string => Boolean(id));
    const recipients = [
      ...new Set(memberIds.length > 0 ? memberIds : [registration.createdBy]),
    ];

    const vehicleName = vehicleDisplayName(registration);
    const maintenanceUrl = `${origin}/garage/${registration.id}/maintenance`;
    const usageReadings = registration.usageReadings ?? [];
    const maintenanceLogs = registration.maintenanceLogs ?? [];
    const latestUsage = usageReadings[0] ?? null;

    const lastLogByTask = new Map<string, (typeof maintenanceLogs)[number]>();
    for (const log of maintenanceLogs) {
      if (!log.taskId || lastLogByTask.has(log.taskId)) continue;
      lastLogByTask.set(log.taskId, log);
    }

    let needsUsageNudge = false;

    for (const task of tasks) {
      tasksEvaluated += 1;

      // One-shot "remind me in X days" — fires when remindOn <= today.
      if (task.remindOn && startOfUtcDay(task.remindOn) <= asOf) {
        const remindDay = isoDayFromDate(task.remindOn);
        clearRemindOnTaskIds.push(task.id);
        for (const userId of recipients) {
          for (const channel of ["email", "push"] as const) {
            planned.push({
              userId,
              registrationId: registration.id,
              channel,
              templateKey: "maintenance_scheduled",
              scheduledFor: asOf,
              dedupeKey: dedupeKey(
                registration.id,
                userId,
                channel,
                "maintenance_scheduled",
                remindDay,
                task.id,
              ),
              daysUntilExpiration: 0,
              taskId: task.id,
              variables: {
                vehicleName,
                daysLeft: 0,
                daysAfter: 0,
                year:
                  registration.year != null ? String(registration.year) : "",
                make: registration.make ?? "",
                model: registration.model ?? "",
                taskName: task.name,
                statusDetail: `Scheduled reminder for ${remindDay}`,
                maintenanceUrl,
              },
            });
          }
        }
      }

      const lastLog = lastLogByTask.get(task.id) ?? null;
      const usesUsage =
        (task.intervalHours != null && task.intervalHours > 0) ||
        (task.intervalMiles != null && task.intervalMiles > 0);
      const stale =
        usesUsage &&
        isUsageStale(latestUsage?.readingOn ?? null, asOf, STALE_USAGE_DAYS);

      if (stale) {
        needsUsageNudge = true;
        continue;
      }

      const status = computeTaskStatus({
        task: {
          intervalMonths: task.intervalMonths,
          intervalHours: task.intervalHours,
          intervalMiles: task.intervalMiles,
          createdAt: task.createdAt,
        },
        lastService: lastLog
          ? {
              performedOn: lastLog.performedOn,
              hoursAtService: lastLog.hoursAtService,
              milesAtService: lastLog.milesAtService,
            }
          : null,
        latestUsage: latestUsage
          ? {
              readingOn: latestUsage.readingOn,
              hours: latestUsage.hours,
              miles: latestUsage.miles,
            }
          : null,
        asOf,
      });

      if (status.status === "ok") continue;

      const templateKey =
        status.status === "overdue"
          ? "maintenance_overdue"
          : "maintenance_due";

      // Due soon: one nudge per day. Overdue: weekly re-nudge via week-bucketed key.
      let scheduleDay = day;
      if (status.status === "overdue") {
        const weekStart = new Date(asOf);
        const weekday = weekStart.getUTCDay();
        weekStart.setUTCDate(weekStart.getUTCDate() - weekday);
        scheduleDay = isoDayFromDate(weekStart);
      }

      for (const userId of recipients) {
        for (const channel of ["email", "push"] as const) {
          planned.push({
            userId,
            registrationId: registration.id,
            channel,
            templateKey,
            scheduledFor: asOf,
            dedupeKey: dedupeKey(
              registration.id,
              userId,
              channel,
              templateKey,
              scheduleDay,
              task.id,
            ),
            daysUntilExpiration: 0,
            variables: {
              vehicleName,
              daysLeft: 0,
              daysAfter: 0,
              year: registration.year != null ? String(registration.year) : "",
              make: registration.make ?? "",
              model: registration.model ?? "",
              taskName: task.name,
              statusDetail: status.statusDetail,
              maintenanceUrl,
            },
          });
        }
      }
    }

    if (needsUsageNudge) {
      const weekStart = new Date(asOf);
      const weekday = weekStart.getUTCDay();
      weekStart.setUTCDate(weekStart.getUTCDate() - weekday);
      const scheduleDay = isoDayFromDate(weekStart);

      for (const userId of recipients) {
        for (const channel of ["email", "push"] as const) {
          planned.push({
            userId,
            registrationId: registration.id,
            channel,
            templateKey: "maintenance_usage_nudge",
            scheduledFor: asOf,
            dedupeKey: dedupeKey(
              registration.id,
              userId,
              channel,
              "maintenance_usage_nudge",
              scheduleDay,
            ),
            daysUntilExpiration: 0,
            variables: {
              vehicleName,
              daysLeft: 0,
              daysAfter: 0,
              year: registration.year != null ? String(registration.year) : "",
              make: registration.make ?? "",
              model: registration.model ?? "",
              maintenanceUrl,
            },
          });
        }
      }
    }
  }

  return {
    planned,
    registrationsEvaluated: registrations.length,
    tasksEvaluated,
    clearRemindOnTaskIds,
  };
}
