import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RenewalStatus } from "@prisma/client";
import {
  advanceRenewalStatus,
  isValidStatusTransition,
  RENEWAL_STATUS_ORDER,
} from "./status";
import type { NotificationService } from "@/lib/notifications/NotificationService";

describe("isValidStatusTransition", () => {
  it("allows only one-step forward transitions", () => {
    expect(isValidStatusTransition("Requested", "DocumentsReceived")).toBe(
      true,
    );
    expect(isValidStatusTransition("DocumentsReceived", "Reviewing")).toBe(
      true,
    );
    expect(isValidStatusTransition("Completed", "StickerMailed")).toBe(true);
  });

  it("rejects skips, backwards, and same-status", () => {
    expect(isValidStatusTransition("Requested", "Reviewing")).toBe(false);
    expect(isValidStatusTransition("Reviewing", "DocumentsReceived")).toBe(
      false,
    );
    expect(isValidStatusTransition("Processing", "Processing")).toBe(false);
  });

  it("covers the full ordered chain", () => {
    for (let i = 0; i < RENEWAL_STATUS_ORDER.length - 1; i++) {
      expect(
        isValidStatusTransition(
          RENEWAL_STATUS_ORDER[i]!,
          RENEWAL_STATUS_ORDER[i + 1]!,
        ),
      ).toBe(true);
    }
  });
});

describe("advanceRenewalStatus", () => {
  const now = new Date("2026-07-22T18:00:00.000Z");

  let findUnique: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let notificationCreate: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  let notificationService: NotificationService;

  beforeEach(() => {
    findUnique = vi.fn();
    update = vi.fn();
    notificationCreate = vi.fn().mockResolvedValue({});
    send = vi.fn().mockResolvedValue(undefined);
    notificationService = { send };
  });

  function mockDb() {
    return {
      renewal: { findUnique, update },
      notification: { create: notificationCreate },
    };
  }

  function seedRenewal(status: RenewalStatus) {
    findUnique.mockResolvedValue({
      id: "ren_1",
      status,
      registrationId: "reg_1",
      registration: {
        id: "reg_1",
        nickname: "Mom's Tahoe",
        year: 2021,
        make: "Chevrolet",
        model: "Tahoe",
      },
      requester: {
        id: "user_1",
        email: "demo@regi.app",
        notificationPrefs: { email: true, push: true, sms: false },
      },
    });
    update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "ren_1",
      status: data.status,
      documentsReceivedAt: data.documentsReceivedAt ?? null,
      reviewingAt: data.reviewingAt ?? null,
    }));
  }

  it("records the transition timestamp and updates status", async () => {
    seedRenewal("Requested");

    const result = await advanceRenewalStatus(
      "ren_1",
      "DocumentsReceived",
      { kind: "user", userId: "user_1" },
      {
        db: mockDb() as never,
        notificationService,
        now,
      },
    );

    expect(result.previousStatus).toBe("Requested");
    expect(result.newStatus).toBe("DocumentsReceived");
    expect(result.transitionedAt).toEqual(now);
    expect(update).toHaveBeenCalledWith({
      where: { id: "ren_1" },
      data: {
        status: "DocumentsReceived",
        documentsReceivedAt: now,
      },
    });
  });

  it("triggers email + push notifications via NotificationService", async () => {
    seedRenewal("DocumentsReceived");

    await advanceRenewalStatus(
      "ren_1",
      "Reviewing",
      { kind: "staff", staffUserId: "staff_1" },
      {
        db: mockDb() as never,
        notificationService,
        now,
      },
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        channel: "email",
        templateKey: "renewal_status_Reviewing",
        to: "demo@regi.app",
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "push",
        templateKey: "renewal_status_Reviewing",
      }),
    );
    expect(notificationCreate).toHaveBeenCalledTimes(2);
  });

  it("respects notification prefs (skips disabled channels)", async () => {
    findUnique.mockResolvedValue({
      id: "ren_1",
      status: "Reviewing",
      registrationId: "reg_1",
      registration: {
        id: "reg_1",
        nickname: null,
        year: 2020,
        make: "Toyota",
        model: "Camry",
      },
      requester: {
        id: "user_1",
        email: "demo@regi.app",
        notificationPrefs: { email: false, push: true, sms: true },
      },
    });
    update.mockResolvedValue({ id: "ren_1", status: "Processing" });

    await advanceRenewalStatus(
      "ren_1",
      "Processing",
      { kind: "system" },
      {
        db: mockDb() as never,
        notificationService,
        now,
      },
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "push" }),
    );
  });

  it("rejects invalid transitions", async () => {
    seedRenewal("Requested");

    await expect(
      advanceRenewalStatus(
        "ren_1",
        "Processing",
        { kind: "user", userId: "user_1" },
        {
          db: mockDb() as never,
          notificationService,
          now,
        },
      ),
    ).rejects.toThrow(/Invalid renewal status transition/);

    expect(update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
