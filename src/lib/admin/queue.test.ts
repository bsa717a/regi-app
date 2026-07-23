import { describe, expect, it } from "vitest";
import {
  ACTIVE_QUEUE_STATUSES,
  buildOverdueRenewalWhere,
  buildRenewalQueueWhere,
  parseRenewalStatusFilter,
} from "./queue";

describe("parseRenewalStatusFilter", () => {
  it("defaults to active queue statuses", () => {
    expect(parseRenewalStatusFilter(null)).toEqual(ACTIVE_QUEUE_STATUSES);
    expect(parseRenewalStatusFilter("")).toEqual(ACTIVE_QUEUE_STATUSES);
    expect(parseRenewalStatusFilter("active")).toEqual(ACTIVE_QUEUE_STATUSES);
  });

  it("supports all and concrete statuses", () => {
    expect(parseRenewalStatusFilter("all")).toBe("all");
    expect(parseRenewalStatusFilter("Reviewing")).toEqual(["Reviewing"]);
  });

  it("rejects unknown values", () => {
    expect(parseRenewalStatusFilter("Nope")).toBeNull();
  });
});

describe("buildRenewalQueueWhere", () => {
  it("builds status filters", () => {
    expect(buildRenewalQueueWhere("all")).toEqual({});
    expect(buildRenewalQueueWhere(["Reviewing"])).toEqual({
      status: { in: ["Reviewing"] },
    });
  });
});

describe("buildOverdueRenewalWhere", () => {
  it("filters active renewals with expired registration", () => {
    const where = buildOverdueRenewalWhere(
      new Date("2026-07-22T15:00:00.000Z"),
    );
    expect(where.status).toEqual({ in: ACTIVE_QUEUE_STATUSES });
    expect(where.registration).toEqual({
      registrationExpiresOn: {
        lt: new Date("2026-07-22T00:00:00.000Z"),
      },
    });
  });
});
