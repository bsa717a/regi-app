import { describe, expect, it } from "vitest";
import { formatNotificationTitle } from "@/lib/notifications/formatTemplate";

describe("formatNotificationTitle", () => {
  it("formats day-based reminder keys", () => {
    expect(formatNotificationTitle("reminder_90")).toBe("90-day renewal reminder");
    expect(formatNotificationTitle("reminder-14-days")).toBe(
      "14-day renewal reminder",
    );
    expect(formatNotificationTitle("reminder_0_day_of")).toBe(
      "Expires today reminder",
    );
  });

  it("formats expired / overdue keys", () => {
    expect(formatNotificationTitle("reminder_expired")).toBe(
      "Registration expired reminder",
    );
    expect(formatNotificationTitle("post_expiration")).toBe(
      "Registration expired reminder",
    );
  });

  it("falls back to a readable title", () => {
    expect(formatNotificationTitle("welcome_email")).toBe("Welcome to REGI");
    expect(formatNotificationTitle("custom_notice")).toBe("Custom notice");
  });
});
