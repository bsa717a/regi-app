import { describe, expect, it } from "vitest";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import {
  computeRegistrationStatus,
  daysUntilExpiration,
  formatExpirationCountdown,
} from "@/lib/stateEngine/status";
import { getDueSoonThresholdDays } from "@/lib/stateEngine/parseConfig";

function configWithThreshold(dueSoonThresholdDays: number): StateRulesConfig {
  return {
    displayName: "Test State",
    requiredDocuments: [],
    renewalWindow: {
      daysBeforeExpirationOpen: 90,
      lateFeeStartsAfterDays: 0,
      expirationConvention: "end of month",
      dueSoonThresholdDays,
    },
    fees: {
      currency: "USD",
      registrationFeeCents: 1000,
      lateFeeCents: 100,
      regiServiceFeeCents: 2500,
    },
    reminderSchedule: {
      daysBeforeExpiration: [90, 60, 30],
      postExpiration: { intervalDays: 3 },
    },
    conciergeWorkflow: [],
  };
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("daysUntilExpiration", () => {
  it("returns positive days for future dates", () => {
    expect(
      daysUntilExpiration(utcDate(2026, 7, 22), utcDate(2026, 7, 1)),
    ).toBe(21);
  });

  it("returns 0 for same calendar day", () => {
    expect(
      daysUntilExpiration(utcDate(2026, 7, 22), utcDate(2026, 7, 22)),
    ).toBe(0);
  });

  it("returns negative days when expired", () => {
    expect(
      daysUntilExpiration(utcDate(2026, 7, 10), utcDate(2026, 7, 22)),
    ).toBe(-12);
  });
});

describe("formatExpirationCountdown", () => {
  const asOf = utcDate(2026, 7, 22);

  it("formats plural future days", () => {
    expect(formatExpirationCountdown(utcDate(2027, 4, 26), asOf)).toBe(
      "Expires in 278 days",
    );
  });

  it("formats singular future day", () => {
    expect(formatExpirationCountdown(utcDate(2026, 7, 23), asOf)).toBe(
      "Expires in 1 day",
    );
  });

  it("formats today", () => {
    expect(formatExpirationCountdown(utcDate(2026, 7, 22), asOf)).toBe(
      "Expires today",
    );
  });

  it("formats singular expired day", () => {
    expect(formatExpirationCountdown(utcDate(2026, 7, 21), asOf)).toBe(
      "Expired 1 day ago",
    );
  });

  it("formats plural expired days", () => {
    expect(formatExpirationCountdown(utcDate(2026, 7, 10), asOf)).toBe(
      "Expired 12 days ago",
    );
  });

  it("formats 43-day countdown", () => {
    expect(formatExpirationCountdown(utcDate(2026, 9, 3), asOf)).toBe(
      "Expires in 43 days",
    );
  });
});

describe("computeRegistrationStatus", () => {
  const asOf = utcDate(2026, 7, 22);
  const utahLike = configWithThreshold(60);

  it("marks Current when beyond the config threshold", () => {
    const result = computeRegistrationStatus(
      utcDate(2027, 4, 26),
      utahLike,
      asOf,
    );
    expect(result.status).toBe("Current");
    expect(result.daysUntilExpiration).toBe(278);
    expect(result.countdown).toBe("Expires in 278 days");
  });

  it("marks Due Soon at the threshold boundary (inclusive)", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 9, 20),
      utahLike,
      asOf,
    );
    expect(result.daysUntilExpiration).toBe(60);
    expect(result.status).toBe("Due Soon");
  });

  it("marks Due Soon just inside the threshold", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 9, 3),
      utahLike,
      asOf,
    );
    expect(result.daysUntilExpiration).toBe(43);
    expect(result.status).toBe("Due Soon");
  });

  it("marks Due Soon on expiration day (not Expired)", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 7, 22),
      utahLike,
      asOf,
    );
    expect(result.status).toBe("Due Soon");
    expect(result.countdown).toBe("Expires today");
  });

  it("marks Expired the day after expiration", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 7, 21),
      utahLike,
      asOf,
    );
    expect(result.status).toBe("Expired");
    expect(result.countdown).toBe("Expired 1 day ago");
  });

  it("marks Expired for older dates", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 7, 10),
      utahLike,
      asOf,
    );
    expect(result.status).toBe("Expired");
    expect(result.daysUntilExpiration).toBe(-12);
    expect(result.countdown).toBe("Expired 12 days ago");
  });

  it("uses threshold from config — second state can change Due Soon window", () => {
    const californiaLike = configWithThreshold(45);
    expect(getDueSoonThresholdDays(californiaLike)).toBe(45);

    // 50 days out: Current under CA (45), Due Soon under UT (60)
    const expires = utcDate(2026, 9, 10);
    expect(daysUntilExpiration(expires, asOf)).toBe(50);

    expect(computeRegistrationStatus(expires, californiaLike, asOf).status).toBe(
      "Current",
    );
    expect(computeRegistrationStatus(expires, utahLike, asOf).status).toBe(
      "Due Soon",
    );
  });

  it("treats day after threshold as Current", () => {
    const result = computeRegistrationStatus(
      utcDate(2026, 9, 21),
      utahLike,
      asOf,
    );
    expect(result.daysUntilExpiration).toBe(61);
    expect(result.status).toBe("Current");
  });
});
