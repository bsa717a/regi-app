import { describe, expect, it } from "vitest";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { computeFeeBreakdown } from "./fees";

function baseConfig(overrides?: Partial<StateRulesConfig>): StateRulesConfig {
  return {
    displayName: "Testland",
    requiredDocuments: [],
    renewalWindow: {
      daysBeforeExpirationOpen: 90,
      lateFeeStartsAfterDays: 0,
      expirationConvention: "end of month",
      dueSoonThresholdDays: 60,
    },
    fees: {
      currency: "USD",
      registrationFeeCents: 4400,
      lateFeeCents: 1000,
      regiServiceFeeCents: 2500,
      notes: "Test fee notes",
    },
    reminderSchedule: {
      daysBeforeExpiration: [30],
      postExpiration: { intervalDays: 3 },
    },
    conciergeWorkflow: [],
    registrationTypes: [],
    ...overrides,
  };
}

describe("computeFeeBreakdown", () => {
  it("sums registration + REGI service fee when not expired", () => {
    const asOf = new Date("2026-07-01T12:00:00.000Z");
    const expires = "2026-08-15";
    const fees = computeFeeBreakdown(baseConfig(), expires, { asOf });

    expect(fees.registrationFeeCents).toBe(4400);
    expect(fees.regiServiceFeeCents).toBe(2500);
    expect(fees.lateFeeCents).toBe(0);
    expect(fees.totalCents).toBe(6900);
    expect(fees.isEstimate).toBe(true);
    expect(fees.notes).toMatch(/not be charged/i);
  });

  it("includes late fee when expired (grace 0)", () => {
    const asOf = new Date("2026-07-10T12:00:00.000Z");
    const expires = "2026-07-01";
    const fees = computeFeeBreakdown(baseConfig(), expires, {
      asOf,
      county: "Salt Lake",
    });

    expect(fees.lateFeeCents).toBe(1000);
    expect(fees.totalCents).toBe(7900);
    expect(fees.county).toBe("Salt Lake");
  });

  it("honors lateFeeStartsAfterDays grace period", () => {
    const config = baseConfig({
      renewalWindow: {
        daysBeforeExpirationOpen: 90,
        lateFeeStartsAfterDays: 5,
        expirationConvention: "end of month",
        dueSoonThresholdDays: 60,
      },
    });
    const asOf = new Date("2026-07-04T12:00:00.000Z");
    // Expired 3 days ago — still within 5-day grace
    const fees = computeFeeBreakdown(config, "2026-07-01", { asOf });
    expect(fees.lateFeeCents).toBe(0);

    const afterGrace = computeFeeBreakdown(config, "2026-07-01", {
      asOf: new Date("2026-07-07T12:00:00.000Z"),
    });
    expect(afterGrace.lateFeeCents).toBe(1000);
  });

  it("reads fee amounts from config (state-agnostic)", () => {
    const config = baseConfig({
      fees: {
        currency: "USD",
        registrationFeeCents: 9999,
        lateFeeCents: 123,
        regiServiceFeeCents: 456,
      },
    });
    const fees = computeFeeBreakdown(config, "2099-01-01", {
      asOf: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(fees.registrationFeeCents).toBe(9999);
    expect(fees.regiServiceFeeCents).toBe(456);
    expect(fees.totalCents).toBe(9999 + 456);
  });
});
