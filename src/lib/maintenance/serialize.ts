import type {
  MaintenanceLog,
  MaintenanceTask,
  RegistrationType,
  UsageReading,
} from "@prisma/client";
import { presetsForRegistrationType } from "./presets";
import { resolveReceiptUrl } from "./receipt";
import { computeTaskStatus, statusSortRank } from "./status";
import type {
  MaintenanceLogDto,
  MaintenanceOverviewDto,
  MaintenanceTaskDto,
  UsageReadingDto,
} from "./types";
import { isoDayFromDate } from "./validation";

export function serializeUsageReading(row: UsageReading): UsageReadingDto {
  return {
    id: row.id,
    registrationId: row.registrationId,
    readingOn: isoDayFromDate(row.readingOn),
    hours: row.hours,
    miles: row.miles,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function serializeLog(
  row: MaintenanceLog & { task?: { name: string } | null },
): Promise<MaintenanceLogDto> {
  return {
    id: row.id,
    registrationId: row.registrationId,
    taskId: row.taskId,
    taskName: row.task?.name ?? null,
    performedOn: isoDayFromDate(row.performedOn),
    hoursAtService: row.hoursAtService,
    milesAtService: row.milesAtService,
    costCents: row.costCents,
    notes: row.notes,
    receiptUrl: await resolveReceiptUrl(row.receiptGcsPath),
    receiptFilename: row.receiptFilename ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeTask(
  task: MaintenanceTask,
  lastLog: MaintenanceLog | null,
  latestUsage: UsageReading | null,
  asOf?: Date,
): MaintenanceTaskDto {
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

  return {
    id: task.id,
    registrationId: task.registrationId,
    name: task.name,
    presetKey: task.presetKey,
    intervalMonths: task.intervalMonths,
    intervalHours: task.intervalHours,
    intervalMiles: task.intervalMiles,
    notes: task.notes,
    remindOn: task.remindOn ? isoDayFromDate(task.remindOn) : null,
    active: task.active,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    status: status.status,
    statusDetail: status.statusDetail,
    lastPerformedOn: lastLog ? isoDayFromDate(lastLog.performedOn) : null,
    lastHoursAtService: lastLog?.hoursAtService ?? null,
    lastMilesAtService: lastLog?.milesAtService ?? null,
  };
}

export async function buildOverview(input: {
  registrationId: string;
  registrationType: RegistrationType;
  vehicleName: string;
  canEdit: boolean;
  tasks: MaintenanceTask[];
  logs: Array<MaintenanceLog & { task?: { name: string } | null }>;
  latestUsage: UsageReading | null;
  asOf?: Date;
}): Promise<MaintenanceOverviewDto> {
  const lastLogByTask = new Map<string, MaintenanceLog>();
  for (const log of input.logs) {
    if (!log.taskId) continue;
    const existing = lastLogByTask.get(log.taskId);
    if (!existing || log.performedOn > existing.performedOn) {
      lastLogByTask.set(log.taskId, log);
    }
  }

  const tasks = input.tasks
    .map((task) =>
      serializeTask(
        task,
        lastLogByTask.get(task.id) ?? null,
        input.latestUsage,
        input.asOf,
      ),
    )
    .sort((a, b) => {
      const rank = statusSortRank(b.status) - statusSortRank(a.status);
      if (rank !== 0) return rank;
      return a.name.localeCompare(b.name);
    });

  const addedPresetKeys = new Set(
    input.tasks
      .map((t) => t.presetKey)
      .filter((key): key is string => Boolean(key)),
  );

  const presets = presetsForRegistrationType(input.registrationType).map(
    (preset) => ({
      ...preset,
      alreadyAdded: addedPresetKeys.has(preset.key),
    }),
  );

  return {
    registrationId: input.registrationId,
    registrationType: input.registrationType,
    vehicleName: input.vehicleName,
    canEdit: input.canEdit,
    latestUsage: input.latestUsage
      ? serializeUsageReading(input.latestUsage)
      : null,
    tasks,
    logs: await Promise.all(input.logs.map((log) => serializeLog(log))),
    presets,
  };
}
