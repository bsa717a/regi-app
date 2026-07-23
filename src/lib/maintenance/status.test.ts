import { describe, expect, it } from "vitest";
import { computeTaskStatus, isUsageStale } from "./status";

describe("computeTaskStatus", () => {
  const asOf = new Date(Date.UTC(2026, 6, 23));

  it("marks hour-based OHV oil change overdue after interval", () => {
    const result = computeTaskStatus({
      task: {
        intervalMonths: null,
        intervalHours: 15,
        intervalMiles: null,
        createdAt: new Date(Date.UTC(2026, 0, 1)),
      },
      lastService: {
        performedOn: new Date(Date.UTC(2026, 5, 1)),
        hoursAtService: 100,
        milesAtService: null,
      },
      latestUsage: {
        readingOn: new Date(Date.UTC(2026, 6, 20)),
        hours: 120,
        miles: null,
      },
      asOf,
    });

    expect(result.status).toBe("overdue");
    expect(result.statusDetail.toLowerCase()).toContain("overdue");
  });

  it("uses whichever interval hits first", () => {
    const result = computeTaskStatus({
      task: {
        intervalMonths: 12,
        intervalHours: 15,
        intervalMiles: null,
        createdAt: new Date(Date.UTC(2026, 0, 1)),
      },
      lastService: {
        performedOn: new Date(Date.UTC(2026, 5, 1)),
        hoursAtService: 10,
        milesAtService: null,
      },
      latestUsage: {
        readingOn: new Date(Date.UTC(2026, 6, 20)),
        hours: 30,
        miles: null,
      },
      asOf,
    });

    expect(result.status).toBe("overdue");
  });

  it("marks due soon near time threshold", () => {
    const result = computeTaskStatus({
      task: {
        intervalMonths: 1,
        intervalHours: null,
        intervalMiles: null,
        createdAt: new Date(Date.UTC(2026, 5, 1)),
      },
      lastService: {
        performedOn: new Date(Date.UTC(2026, 5, 28)),
        hoursAtService: null,
        milesAtService: null,
      },
      latestUsage: null,
      asOf,
    });

    expect(result.status).toBe("due_soon");
  });

  it("stays ok when under threshold", () => {
    const result = computeTaskStatus({
      task: {
        intervalMonths: null,
        intervalHours: 15,
        intervalMiles: null,
        createdAt: new Date(Date.UTC(2026, 0, 1)),
      },
      lastService: {
        performedOn: new Date(Date.UTC(2026, 5, 1)),
        hoursAtService: 100,
        milesAtService: null,
      },
      latestUsage: {
        readingOn: new Date(Date.UTC(2026, 6, 20)),
        hours: 105,
        miles: null,
      },
      asOf,
    });

    expect(result.status).toBe("ok");
  });
});

describe("isUsageStale", () => {
  it("treats missing readings as stale", () => {
    expect(isUsageStale(null)).toBe(true);
  });

  it("flags readings older than 60 days", () => {
    const asOf = new Date(Date.UTC(2026, 6, 23));
    expect(isUsageStale(new Date(Date.UTC(2026, 3, 1)), asOf, 60)).toBe(true);
    expect(isUsageStale(new Date(Date.UTC(2026, 6, 1)), asOf, 60)).toBe(false);
  });
});
