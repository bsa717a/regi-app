import { describe, expect, it, vi } from "vitest";
import { DefaultNotificationService } from "./DefaultNotificationService";
import type { EmailProvider } from "./EmailProvider";
import type { PushProvider } from "./PushProvider";

describe("DefaultNotificationService", () => {
  const emailProvider: EmailProvider = {
    send: vi.fn(async () => {}),
  };
  const pushProvider: PushProvider = {
    send: vi.fn(async () => {}),
  };

  it("sends email when prefs.email is true", async () => {
    const service = new DefaultNotificationService({
      emailProvider,
      pushProvider,
      resolveUser: async () => ({
        email: "alex@example.com",
        prefs: { push: true, email: true, sms: false },
      }),
    });

    await service.send({
      userId: "u1",
      channel: "email",
      templateKey: "reminder_60",
      variables: { vehicleName: "Mom's Tahoe", daysLeft: 60 },
    });

    expect(emailProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alex@example.com",
        subject: expect.stringContaining("nervous"),
      }),
    );
  });

  it("does not email when prefs.email is false", async () => {
    const email = { send: vi.fn(async () => {}) };
    const service = new DefaultNotificationService({
      emailProvider: email,
      pushProvider,
      resolveUser: async () => ({
        email: "alex@example.com",
        prefs: { push: true, email: false, sms: false },
      }),
    });

    await service.send({
      userId: "u1",
      channel: "email",
      templateKey: "reminder_60",
      variables: { vehicleName: "X", daysLeft: 60 },
    });

    expect(email.send).not.toHaveBeenCalled();
  });

  it("skips SMS without throwing", async () => {
    const service = new DefaultNotificationService({
      emailProvider,
      pushProvider,
      resolveUser: async () => ({
        email: "a@b.com",
        prefs: { push: true, email: true, sms: true },
      }),
    });

    await expect(
      service.send({
        userId: "u1",
        channel: "sms",
        templateKey: "reminder_3",
      }),
    ).resolves.toBeUndefined();
  });

  it("calls push provider when prefs.push is true", async () => {
    const push = { send: vi.fn(async () => {}) };
    const service = new DefaultNotificationService({
      emailProvider,
      pushProvider: push,
      resolveUser: async () => ({
        email: "a@b.com",
        fcmToken: null,
        prefs: { push: true, email: true, sms: false },
      }),
    });

    await service.send({
      userId: "u1",
      channel: "push",
      templateKey: "reminder_7",
      variables: { vehicleName: "X", daysLeft: 7 },
    });

    expect(push.send).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("week"),
      }),
    );
  });
});
