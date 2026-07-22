import { describe, expect, it } from "vitest";
import type { ReminderSchedule } from "@/lib/stateEngine/types";
import {
  matchReminderForToday,
  planRemindersForVehicles,
  plannedDedupeKeys,
  postExpirationTemplateKey,
  preExpirationTemplateKey,
} from "./schedule";
import type { ReminderVehicleInput } from "./types";

const DEFAULT_SCHEDULE: ReminderSchedule = {
  daysBeforeExpiration: [90, 60, 30, 14, 7, 3, 0],
  postExpiration: { intervalDays: 3, maxReminders: 10 },
};

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function vehicle(
  overrides: Partial<ReminderVehicleInput> & { id: string },
): ReminderVehicleInput {
  return {
    registrationExpiresOn: utcDate(2026, 10, 20),
    recipientUserIds: ["user-1"],
    nickname: "Mom's Tahoe",
    year: 2021,
    make: "Chevrolet",
    model: "Tahoe",
    ...overrides,
  };
}

describe("preExpirationTemplateKey / postExpirationTemplateKey", () => {
  it("builds stable keys", () => {
    expect(preExpirationTemplateKey(90)).toBe("reminder_90");
    expect(preExpirationTemplateKey(0)).toBe("reminder_0");
    expect(postExpirationTemplateKey()).toBe("post_expiration");
  });
});

describe("matchReminderForToday", () => {
  it("matches each default pre-expiration offset from schedule config", () => {
    for (const days of DEFAULT_SCHEDULE.daysBeforeExpiration) {
      expect(matchReminderForToday(days, DEFAULT_SCHEDULE)).toEqual({
        templateKey: `reminder_${days}`,
      });
    }
  });

  it("does not match days outside the schedule (e.g. 180)", () => {
    expect(matchReminderForToday(180, DEFAULT_SCHEDULE)).toBeNull();
    expect(matchReminderForToday(45, DEFAULT_SCHEDULE)).toBeNull();
    expect(matchReminderForToday(1, DEFAULT_SCHEDULE)).toBeNull();
  });

  it("uses custom daysBeforeExpiration from state_rules config — not hard-coded", () => {
    const custom: ReminderSchedule = {
      daysBeforeExpiration: [45, 10],
      postExpiration: { intervalDays: 5, maxReminders: 2 },
    };
    expect(matchReminderForToday(45, custom)).toEqual({
      templateKey: "reminder_45",
    });
    expect(matchReminderForToday(10, custom)).toEqual({
      templateKey: "reminder_10",
    });
    // Default offsets must NOT fire when absent from custom config
    expect(matchReminderForToday(90, custom)).toBeNull();
    expect(matchReminderForToday(60, custom)).toBeNull();
    expect(matchReminderForToday(30, custom)).toBeNull();
    expect(matchReminderForToday(0, custom)).toBeNull();
  });

  it("fires post-expiration on the configured cadence", () => {
    expect(matchReminderForToday(-3, DEFAULT_SCHEDULE)).toEqual({
      templateKey: "post_expiration",
    });
    expect(matchReminderForToday(-6, DEFAULT_SCHEDULE)).toEqual({
      templateKey: "post_expiration",
    });
    expect(matchReminderForToday(-9, DEFAULT_SCHEDULE)).toEqual({
      templateKey: "post_expiration",
    });
  });

  it("does not fire post-expiration off-cadence or on day 0 (handled by pre)", () => {
    expect(matchReminderForToday(-1, DEFAULT_SCHEDULE)).toBeNull();
    expect(matchReminderForToday(-2, DEFAULT_SCHEDULE)).toBeNull();
    expect(matchReminderForToday(-4, DEFAULT_SCHEDULE)).toBeNull();
    expect(matchReminderForToday(0, DEFAULT_SCHEDULE)).toEqual({
      templateKey: "reminder_0",
    });
  });

  it("respects postExpiration.maxReminders", () => {
    const capped: ReminderSchedule = {
      daysBeforeExpiration: [],
      postExpiration: { intervalDays: 3, maxReminders: 2 },
    };
    expect(matchReminderForToday(-3, capped)).toEqual({
      templateKey: "post_expiration",
    });
    expect(matchReminderForToday(-6, capped)).toEqual({
      templateKey: "post_expiration",
    });
    // ordinal 3 > max 2
    expect(matchReminderForToday(-9, capped)).toBeNull();
  });

  it("uses custom post-expiration interval from config", () => {
    const custom: ReminderSchedule = {
      daysBeforeExpiration: [],
      postExpiration: { intervalDays: 5, maxReminders: 4 },
    };
    expect(matchReminderForToday(-5, custom)).toEqual({
      templateKey: "post_expiration",
    });
    expect(matchReminderForToday(-3, custom)).toBeNull();
    expect(matchReminderForToday(-10, custom)).toEqual({
      templateKey: "post_expiration",
    });
  });
});

describe("planRemindersForVehicles", () => {
  it("generates email + push rows for a matching pre-expiration day", () => {
    const asOf = utcDate(2026, 7, 22); // 90 days before Oct 20
    const planned = planRemindersForVehicles(
      [vehicle({ id: "veh-1", registrationExpiresOn: utcDate(2026, 10, 20) })],
      { schedule: DEFAULT_SCHEDULE, asOf },
    );

    expect(planned).toHaveLength(2);
    expect(planned.map((p) => p.channel).sort()).toEqual(["email", "push"]);
    expect(planned.every((p) => p.templateKey === "reminder_90")).toBe(true);
    expect(planned.every((p) => p.daysUntilExpiration === 90)).toBe(true);
    expect(planned[0]?.variables.vehicleName).toBe("Mom's Tahoe");
    expect(planned[0]?.variables.daysLeft).toBe(90);
  });

  it("generates the classic 43-day-style copy variables when schedule includes 43", () => {
    const custom: ReminderSchedule = {
      daysBeforeExpiration: [43],
      postExpiration: { intervalDays: 3 },
    };
    const asOf = utcDate(2026, 7, 22);
    const expires = utcDate(2026, 9, 3); // 43 days later
    const planned = planRemindersForVehicles(
      [vehicle({ id: "veh-43", registrationExpiresOn: expires })],
      { schedule: custom, asOf },
    );
    expect(planned).toHaveLength(2);
    expect(planned[0]?.templateKey).toBe("reminder_43");
    expect(planned[0]?.variables.daysLeft).toBe(43);
  });

  it("is idempotent — re-planning the same day yields identical dedupe keys", () => {
    const asOf = utcDate(2026, 7, 22);
    const vehicles = [
      vehicle({ id: "veh-1", registrationExpiresOn: utcDate(2026, 10, 20) }),
    ];
    const first = planRemindersForVehicles(vehicles, {
      schedule: DEFAULT_SCHEDULE,
      asOf,
    });
    const second = planRemindersForVehicles(vehicles, {
      schedule: DEFAULT_SCHEDULE,
      asOf,
    });

    expect(plannedDedupeKeys(first)).toEqual(plannedDedupeKeys(second));
    expect(first).toHaveLength(2);
    // Same set — no duplicates within a single plan either
    expect(plannedDedupeKeys(first)).toHaveLength(first.length);
  });

  it("creates one row set per recipient user", () => {
    const asOf = utcDate(2026, 7, 22);
    const planned = planRemindersForVehicles(
      [
        vehicle({
          id: "veh-1",
          registrationExpiresOn: utcDate(2026, 10, 20),
          recipientUserIds: ["user-a", "user-b"],
        }),
      ],
      { schedule: DEFAULT_SCHEDULE, asOf },
    );
    expect(planned).toHaveLength(4); // 2 users × 2 channels
    expect(new Set(planned.map((p) => p.userId))).toEqual(
      new Set(["user-a", "user-b"]),
    );
  });

  it("skips vehicles with no recipients", () => {
    const planned = planRemindersForVehicles(
      [
        vehicle({
          id: "veh-1",
          recipientUserIds: [],
          registrationExpiresOn: utcDate(2026, 10, 20),
        }),
      ],
      { schedule: DEFAULT_SCHEDULE, asOf: utcDate(2026, 7, 22) },
    );
    expect(planned).toHaveLength(0);
  });

  it("plans escalated post-expiration reminders", () => {
    const asOf = utcDate(2026, 7, 25);
    const expires = utcDate(2026, 7, 22); // expired 3 days ago
    const planned = planRemindersForVehicles(
      [vehicle({ id: "veh-exp", registrationExpiresOn: expires })],
      { schedule: DEFAULT_SCHEDULE, asOf },
    );
    expect(planned).toHaveLength(2);
    expect(planned[0]?.templateKey).toBe("post_expiration");
    expect(planned[0]?.daysUntilExpiration).toBe(-3);
    expect(planned[0]?.variables.daysAfter).toBe(3);
    expect(planned[0]?.dedupeKey).toContain("post_expiration");
  });

  it("does not plan SMS channels", () => {
    const planned = planRemindersForVehicles(
      [vehicle({ id: "veh-1", registrationExpiresOn: utcDate(2026, 10, 20) })],
      { schedule: DEFAULT_SCHEDULE, asOf: utcDate(2026, 7, 22) },
    );
    expect(planned.every((p) => p.channel !== "sms")).toBe(true);
  });

  it("dedupe key includes vehicle, user, channel, template, and date", () => {
    const asOf = utcDate(2026, 7, 22);
    const planned = planRemindersForVehicles(
      [vehicle({ id: "veh-1", registrationExpiresOn: utcDate(2026, 10, 20) })],
      { schedule: DEFAULT_SCHEDULE, asOf, channels: ["email"] },
    );
    expect(planned).toHaveLength(1);
    expect(planned[0]?.dedupeKey).toBe(
      "veh-1:user-1:email:reminder_90:2026-07-22",
    );
  });
});
