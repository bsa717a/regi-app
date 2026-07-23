import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationService } from "@/lib/notifications/NotificationService";
import { runReminderTick } from "./tick";

type MockDb = {
  registration: { findMany: ReturnType<typeof vi.fn> };
  stateRule: { findMany: ReturnType<typeof vi.fn> };
  maintenanceTask: { updateMany: ReturnType<typeof vi.fn> };
  notification: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

function utahConfig() {
  return {
    displayName: "Utah",
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
    },
    reminderSchedule: {
      daysBeforeExpiration: [90, 60, 30, 14, 7, 3, 0],
      postExpiration: { intervalDays: 3, maxReminders: 10 },
    },
    conciergeWorkflow: [],
  };
}

describe("runReminderTick", () => {
  let db: MockDb;
  let sends: Array<Parameters<NotificationService["send"]>[0]>;
  let notificationService: NotificationService;

  beforeEach(() => {
    sends = [];
    notificationService = {
      send: vi.fn(async (payload) => {
        sends.push(payload);
      }),
    };
    db = {
      registration: { findMany: vi.fn() },
      stateRule: { findMany: vi.fn() },
      maintenanceTask: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      notification: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };
  });

  function mockRegistrationFindMany(expiryRows: unknown[]) {
    // First call: expiry planner. Second call: maintenance planner (empty = no maint rows).
    db.registration.findMany
      .mockResolvedValueOnce(expiryRows)
      .mockResolvedValueOnce([]);
  }

  it("upserts planned rows and dispatches due notifications", async () => {
    const asOf = new Date(Date.UTC(2026, 6, 22)); // Jul 22
    const expires = new Date(Date.UTC(2026, 9, 20)); // Oct 20 = +90 days

    mockRegistrationFindMany([
      {
        id: "reg-1",
        state: "UT",
        registrationExpiresOn: expires,
        nickname: "Mom's Tahoe",
        year: 2021,
        make: "Chevrolet",
        model: "Tahoe",
        createdBy: "user-1",
        household: { members: [{ userId: "user-1" }] },
      },
    ]);
    db.stateRule.findMany.mockResolvedValue([
      { stateCode: "UT", config: utahConfig() },
    ]);
    db.notification.findUnique.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: "n1" });
    db.notification.findMany.mockResolvedValue([
      {
        id: "n-email",
        userId: "user-1",
        registrationId: "reg-1",
        channel: "email",
        templateKey: "reminder_90",
        dedupeKey: "reg-1:user-1:email:reminder_90:2026-07-22",
        scheduledFor: asOf,
        status: "pending",
        user: {
          id: "user-1",
          email: "alex@example.com",
          notificationPrefs: { push: true, email: true, sms: false },
        },
        registration: {
          nickname: "Mom's Tahoe",
          year: 2021,
          make: "Chevrolet",
          model: "Tahoe",
          registrationExpiresOn: expires,
        },
      },
    ]);
    db.notification.update.mockResolvedValue({});

    const result = await runReminderTick({
      db: db as never,
      notificationService,
      asOf,
    });

    expect(result.registrationsEvaluated).toBe(1);
    expect(result.planned).toBe(2); // email + push
    expect(result.upserted).toBe(2);
    expect(result.skippedDuplicate).toBe(0);
    expect(db.notification.create).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect(sends).toHaveLength(1);
    expect(sends[0]?.channel).toBe("email");
    expect(sends[0]?.templateKey).toBe("reminder_90");
  });

  it("does not create duplicates when dedupe keys already exist", async () => {
    const asOf = new Date(Date.UTC(2026, 6, 22));
    const expires = new Date(Date.UTC(2026, 9, 20));

    mockRegistrationFindMany([
      {
        id: "reg-1",
        state: "UT",
        registrationExpiresOn: expires,
        nickname: "Mom's Tahoe",
        year: 2021,
        make: "Chevrolet",
        model: "Tahoe",
        createdBy: "user-1",
        household: { members: [{ userId: "user-1" }] },
      },
    ]);
    db.stateRule.findMany.mockResolvedValue([
      { stateCode: "UT", config: utahConfig() },
    ]);
    db.notification.findUnique.mockResolvedValue({ id: "existing" });
    db.notification.findMany.mockResolvedValue([]);

    const result = await runReminderTick({
      db: db as never,
      notificationService,
      asOf,
    });

    expect(result.upserted).toBe(0);
    expect(result.skippedDuplicate).toBe(2);
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("skips dispatch when email prefs are disabled", async () => {
    const asOf = new Date(Date.UTC(2026, 6, 22));
    mockRegistrationFindMany([]);
    db.stateRule.findMany.mockResolvedValue([]);
    db.notification.findMany.mockResolvedValue([
      {
        id: "n-email",
        userId: "user-1",
        registrationId: "reg-1",
        channel: "email",
        templateKey: "reminder_30",
        dedupeKey: "reg-1:user-1:email:reminder_30:2026-07-22",
        scheduledFor: asOf,
        status: "pending",
        user: {
          id: "user-1",
          email: "alex@example.com",
          notificationPrefs: { push: true, email: false, sms: false },
        },
        registration: {
          nickname: "X",
          year: 2020,
          make: "Ford",
          model: "F-150",
          registrationExpiresOn: asOf,
        },
      },
    ]);
    db.notification.update.mockResolvedValue({});

    const result = await runReminderTick({
      db: db as never,
      notificationService,
      asOf,
    });

    expect(result.skippedByPrefs).toBe(1);
    expect(result.sent).toBe(0);
    expect(sends).toHaveLength(0);
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: "n-email" },
      data: { status: "cancelled" },
    });
  });

  it("records send failures without aborting the run", async () => {
    const asOf = new Date(Date.UTC(2026, 6, 22));
    notificationService = {
      send: vi.fn(async () => {
        throw new Error("smtp down");
      }),
    };
    mockRegistrationFindMany([]);
    db.stateRule.findMany.mockResolvedValue([]);
    db.notification.findMany.mockResolvedValue([
      {
        id: "n-fail",
        userId: "user-1",
        registrationId: "reg-1",
        channel: "email",
        templateKey: "reminder_7",
        dedupeKey: "reg-1:user-1:email:reminder_7:2026-07-22",
        scheduledFor: asOf,
        status: "pending",
        user: {
          id: "user-1",
          email: "alex@example.com",
          notificationPrefs: { push: true, email: true, sms: false },
        },
        registration: {
          nickname: "X",
          year: null,
          make: null,
          model: null,
          registrationExpiresOn: asOf,
        },
      },
    ]);
    db.notification.update.mockResolvedValue({});

    const result = await runReminderTick({
      db: db as never,
      notificationService,
      asOf,
    });

    expect(result.failed).toBe(1);
    expect(result.errors.some((e) => e.includes("smtp down"))).toBe(true);
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: "n-fail" },
      data: { status: "failed" },
    });
  });

  it("reads reminder offsets from state_rules config (custom schedule)", async () => {
    const asOf = new Date(Date.UTC(2026, 6, 22));
    // Jul 22 + 45 days = Sep 5
    const expires45 = new Date(Date.UTC(2026, 8, 5));

    mockRegistrationFindMany([
      {
        id: "reg-custom",
        state: "NV",
        registrationExpiresOn: expires45,
        nickname: "Desert Runner",
        year: 2019,
        make: "Jeep",
        model: "Wrangler",
        createdBy: "user-2",
        household: { members: [{ userId: "user-2" }] },
      },
    ]);
    db.stateRule.findMany.mockResolvedValue([
      {
        stateCode: "NV",
        config: {
          ...utahConfig(),
          displayName: "Nevada",
          reminderSchedule: {
            daysBeforeExpiration: [45],
            postExpiration: { intervalDays: 5, maxReminders: 2 },
          },
        },
      },
    ]);
    db.notification.findUnique.mockResolvedValue(null);
    db.notification.create.mockResolvedValue({ id: "n" });
    db.notification.findMany.mockResolvedValue([]);

    const result = await runReminderTick({
      db: db as never,
      notificationService,
      asOf,
    });

    expect(result.planned).toBe(2);
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          templateKey: "reminder_45",
        }),
      }),
    );
  });
});
