import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  mergeNotificationPrefs,
  parseNotificationPrefs,
} from "@/lib/auth/notificationPrefs";

describe("parseNotificationPrefs", () => {
  it("returns defaults for empty or invalid values", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("{}")).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs([])).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("preserves known boolean channels and falls back for others", () => {
    expect(
      parseNotificationPrefs({ push: false, email: true, sms: true, other: 1 }),
    ).toEqual({
      push: false,
      email: true,
      sms: true,
    });
  });
});

describe("mergeNotificationPrefs", () => {
  it("merges only provided boolean fields", () => {
    expect(
      mergeNotificationPrefs(DEFAULT_NOTIFICATION_PREFS, { email: false }),
    ).toEqual({
      push: true,
      email: false,
      sms: false,
    });
  });
});
