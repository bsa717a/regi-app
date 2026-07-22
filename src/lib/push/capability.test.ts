import { describe, expect, it } from "vitest";
import { getPushCapability, isVapidConfigured } from "./capability";

describe("push capability helpers", () => {
  it("treats blank/whitespace VAPID as unconfigured", () => {
    expect(isVapidConfigured("")).toBe(false);
    expect(isVapidConfigured("   ")).toBe(false);
    expect(isVapidConfigured(null)).toBe(false);
    expect(isVapidConfigured("BPxxxxxxxx")).toBe(true);
  });

  it("degrades with an explanatory note when VAPID is blank", () => {
    const result = getPushCapability({
      vapidKey: "",
      hasNotificationApi: true,
      hasServiceWorker: true,
      notificationPermission: "default",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_vapid");
      expect(result.message.toLowerCase()).toContain("web push");
    }
  });

  it("degrades when permission is denied", () => {
    const result = getPushCapability({
      vapidKey: "BPxxxx",
      hasNotificationApi: true,
      hasServiceWorker: true,
      notificationPermission: "denied",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("denied");
    }
  });

  it("degrades when browser APIs are missing", () => {
    const result = getPushCapability({
      vapidKey: "BPxxxx",
      hasNotificationApi: false,
      hasServiceWorker: true,
      notificationPermission: "default",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("unsupported");
    }
  });

  it("allows enabling when VAPID is set and permission is default/granted", () => {
    expect(
      getPushCapability({
        vapidKey: "BPxxxx",
        hasNotificationApi: true,
        hasServiceWorker: true,
        notificationPermission: "default",
      }).ok,
    ).toBe(true);
    expect(
      getPushCapability({
        vapidKey: "BPxxxx",
        hasNotificationApi: true,
        hasServiceWorker: true,
        notificationPermission: "granted",
      }).ok,
    ).toBe(true);
  });
});
