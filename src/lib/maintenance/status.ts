import type { MaintenanceDueStatus } from "./types";

/** Fraction of interval used before we mark a task "due soon". */
export const DUE_SOON_THRESHOLD = 0.8;

export type TaskIntervalInput = {
  intervalMonths: number | null;
  intervalHours: number | null;
  intervalMiles: number | null;
  createdAt: Date;
};

export type LastServiceInput = {
  performedOn: Date;
  hoursAtService: number | null;
  milesAtService: number | null;
} | null;

export type LatestUsageInput = {
  readingOn: Date;
  hours: number | null;
  miles: number | null;
} | null;

export type TaskStatusResult = {
  status: MaintenanceDueStatus;
  statusDetail: string;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.floor(ms / 86_400_000);
}

type AxisEvaluation = {
  status: MaintenanceDueStatus;
  detail: string;
  /** Higher = more urgent (overdue > due_soon > ok). */
  urgency: number;
};

function urgencyRank(status: MaintenanceDueStatus): number {
  switch (status) {
    case "overdue":
      return 2;
    case "due_soon":
      return 1;
    default:
      return 0;
  }
}

function evaluateMonths(
  intervalMonths: number,
  baselineDate: Date,
  asOf: Date,
): AxisEvaluation {
  const dueDate = addUtcMonths(baselineDate, intervalMonths);
  const totalDays = Math.max(daysBetween(baselineDate, dueDate), 1);
  const elapsedDays = daysBetween(baselineDate, asOf);
  const remainingDays = daysBetween(asOf, dueDate);

  if (elapsedDays >= totalDays) {
    const overdueDays = Math.abs(remainingDays);
    return {
      status: "overdue",
      detail:
        overdueDays === 0
          ? "Due today (time interval)"
          : `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
      urgency: 2,
    };
  }

  const ratio = elapsedDays / totalDays;
  if (ratio >= DUE_SOON_THRESHOLD) {
    return {
      status: "due_soon",
      detail: `Due in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
      urgency: 1,
    };
  }

  return {
    status: "ok",
    detail: `Next due in about ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
    urgency: 0,
  };
}

function evaluateUsage(
  kind: "hours" | "miles",
  interval: number,
  baseline: number | null,
  current: number | null,
): AxisEvaluation | null {
  if (baseline == null || current == null) {
    return null;
  }

  const used = Math.max(current - baseline, 0);
  const remaining = interval - used;

  if (used >= interval) {
    const overdue = Math.round((used - interval) * 10) / 10;
    return {
      status: "overdue",
      detail:
        overdue <= 0
          ? `Due now (${kind})`
          : `Overdue by ${overdue} ${kind}`,
      urgency: 2,
    };
  }

  const ratio = used / interval;
  if (ratio >= DUE_SOON_THRESHOLD) {
    const rem = Math.round(remaining * 10) / 10;
    return {
      status: "due_soon",
      detail: `Due in about ${rem} ${kind}`,
      urgency: 1,
    };
  }

  const rem = Math.round(remaining * 10) / 10;
  return {
    status: "ok",
    detail: `${rem} ${kind} until next service`,
    urgency: 0,
  };
}

/**
 * Compute due status for a maintenance task.
 * Due when whichever configured interval (months / hours / miles) is hit first.
 * Baseline = last service log for the task, or task creation date / 0 usage.
 */
export function computeTaskStatus(input: {
  task: TaskIntervalInput;
  lastService: LastServiceInput;
  latestUsage: LatestUsageInput;
  asOf?: Date;
}): TaskStatusResult {
  const asOf = startOfUtcDay(input.asOf ?? new Date());
  const baselineDate = startOfUtcDay(
    input.lastService?.performedOn ?? input.task.createdAt,
  );
  // Only invent a 0 baseline when there is no prior service log.
  // If the last service omitted hours/miles, do not treat that as zero
  // (which would falsely mark the interval overdue against the current meter).
  const baselineHours =
    input.lastService != null ? input.lastService.hoursAtService : 0;
  const baselineMiles =
    input.lastService != null ? input.lastService.milesAtService : 0;

  const usesUsage =
    (input.task.intervalHours != null && input.task.intervalHours > 0) ||
    (input.task.intervalMiles != null && input.task.intervalMiles > 0);
  const usageStale =
    usesUsage &&
    isUsageStale(input.latestUsage?.readingOn ?? null, asOf);

  const evaluations: AxisEvaluation[] = [];

  if (input.task.intervalMonths != null && input.task.intervalMonths > 0) {
    evaluations.push(
      evaluateMonths(input.task.intervalMonths, baselineDate, asOf),
    );
  }

  if (input.task.intervalHours != null && input.task.intervalHours > 0) {
    if (usageStale) {
      evaluations.push({
        status: "ok",
        detail: "Update engine hours to refresh this interval",
        urgency: 0,
      });
    }
    const hoursEval = usageStale
      ? null
      : evaluateUsage(
          "hours",
          input.task.intervalHours,
          baselineHours,
          input.latestUsage?.hours ?? null,
        );
    if (hoursEval) {
      evaluations.push(hoursEval);
    } else if (!usageStale && input.lastService != null && baselineHours == null) {
      evaluations.push({
        status: "ok",
        detail: "Log hours at next service to track this interval",
        urgency: 0,
      });
    } else if (
      !usageStale &&
      !input.latestUsage?.hours &&
      input.lastService == null
    ) {
      evaluations.push({
        status: "ok",
        detail: "Log engine hours to track this interval",
        urgency: 0,
      });
    } else if (!usageStale && !input.latestUsage?.hours) {
      evaluations.push({
        status: "ok",
        detail: "Log current engine hours to refresh status",
        urgency: 0,
      });
    }
  }

  if (input.task.intervalMiles != null && input.task.intervalMiles > 0) {
    if (usageStale) {
      evaluations.push({
        status: "ok",
        detail: "Update odometer to refresh this interval",
        urgency: 0,
      });
    }
    const milesEval = usageStale
      ? null
      : evaluateUsage(
          "miles",
          input.task.intervalMiles,
          baselineMiles,
          input.latestUsage?.miles ?? null,
        );
    if (milesEval) {
      evaluations.push(milesEval);
    } else if (!usageStale && input.lastService != null && baselineMiles == null) {
      evaluations.push({
        status: "ok",
        detail: "Log odometer at next service to track this interval",
        urgency: 0,
      });
    } else if (
      !usageStale &&
      !input.latestUsage?.miles &&
      input.lastService == null
    ) {
      evaluations.push({
        status: "ok",
        detail: "Log odometer to track this interval",
        urgency: 0,
      });
    } else if (!usageStale && !input.latestUsage?.miles) {
      evaluations.push({
        status: "ok",
        detail: "Log current odometer to refresh status",
        urgency: 0,
      });
    }
  }

  if (evaluations.length === 0) {
    return {
      status: "ok",
      statusDetail: "No interval configured",
    };
  }

  // Whichever threshold is hit first = highest urgency wins.
  evaluations.sort((a, b) => b.urgency - a.urgency);
  const worst = evaluations[0]!;
  return {
    status: worst.status,
    statusDetail: worst.detail,
  };
}

export function statusSortRank(status: MaintenanceDueStatus): number {
  return urgencyRank(status);
}

/** True when a usage reading is older than `staleDays` (UTC). */
export function isUsageStale(
  readingOn: Date | null | undefined,
  asOf: Date = new Date(),
  staleDays = 60,
): boolean {
  if (!readingOn) return true;
  return daysBetween(readingOn, asOf) > staleDays;
}
