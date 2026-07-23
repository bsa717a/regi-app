import { prisma } from "@/lib/prisma";
import { computeTaskStatus, isUsageStale } from "./status";

/**
 * Count active tasks that are due_soon or overdue for each registration.
 * Used for garage card badges without loading full overviews.
 */
export async function countDueMaintenanceByRegistration(
  registrationIds: string[],
  asOf: Date = new Date(),
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of registrationIds) counts.set(id, 0);
  if (registrationIds.length === 0) return counts;

  // Fail soft: stale Prisma clients / pending migrations must not break garage.
  const taskDelegate = (
    prisma as unknown as {
      maintenanceTask?: { findMany: typeof prisma.registration.findMany };
      maintenanceLog?: { findMany: typeof prisma.registration.findMany };
      usageReading?: { findMany: typeof prisma.registration.findMany };
    }
  ).maintenanceTask;
  if (!taskDelegate) return counts;

  try {
    const [tasks, logs, usages] = await Promise.all([
      prisma.maintenanceTask.findMany({
        where: { registrationId: { in: registrationIds }, active: true },
      }),
      prisma.maintenanceLog.findMany({
        where: {
          registrationId: { in: registrationIds },
          taskId: { not: null },
        },
        orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
      }),
      prisma.usageReading.findMany({
        where: { registrationId: { in: registrationIds } },
        orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const lastLogByTask = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      if (!log.taskId || lastLogByTask.has(log.taskId)) continue;
      lastLogByTask.set(log.taskId, log);
    }

    const latestUsageByReg = new Map<string, (typeof usages)[number]>();
    for (const usage of usages) {
      if (latestUsageByReg.has(usage.registrationId)) continue;
      latestUsageByReg.set(usage.registrationId, usage);
    }

    for (const task of tasks) {
      const lastLog = lastLogByTask.get(task.id) ?? null;
      const latestUsage = latestUsageByReg.get(task.registrationId) ?? null;
      const usesUsage =
        (task.intervalHours != null && task.intervalHours > 0) ||
        (task.intervalMiles != null && task.intervalMiles > 0);
      // Match reminder planner: stale meter readings → nudge for usage, not "due".
      if (
        usesUsage &&
        isUsageStale(latestUsage?.readingOn ?? null, asOf)
      ) {
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

      if (status.status === "due_soon" || status.status === "overdue") {
        counts.set(
          task.registrationId,
          (counts.get(task.registrationId) ?? 0) + 1,
        );
      }
    }
  } catch {
    // Tables missing or query failure — return zeros rather than 500 the garage.
    return counts;
  }

  return counts;
}
