import { describe, expect, it } from "vitest";
import { formatTemplate } from "@/lib/notifications/formatTemplate";
import {
  getNotificationTemplate,
  reminderTemplateKeyForDays,
  renderNotificationTemplate,
  toneForDaysUntil,
} from "@/lib/notifications/templates";

describe("formatTemplate", () => {
  it("interpolates variables", () => {
    expect(
      formatTemplate("{{daysLeft}} days left on {{vehicleName}}.", {
        daysLeft: 43,
        vehicleName: "Mom's Tahoe",
      }),
    ).toBe("43 days left on Mom's Tahoe.");
  });

  it("replaces missing variables with empty string", () => {
    expect(formatTemplate("Hello {{name}}!", {})).toBe("Hello !");
  });
});

describe("toneForDaysUntil", () => {
  it("escalates tone as expiration nears and after expiry", () => {
    expect(toneForDaysUntil(90)).toBe("friendly");
    expect(toneForDaysUntil(60)).toBe("friendly");
    expect(toneForDaysUntil(30)).toBe("nudge");
    expect(toneForDaysUntil(14)).toBe("nudge");
    expect(toneForDaysUntil(7)).toBe("urgent");
    expect(toneForDaysUntil(3)).toBe("urgent");
    expect(toneForDaysUntil(0)).toBe("urgent");
    expect(toneForDaysUntil(-3)).toBe("critical");
  });
});

describe("reminder templates", () => {
  it("includes the classic nervous-sticker copy at 60 days", () => {
    const rendered = renderNotificationTemplate("reminder_60", {
      vehicleName: "Mom's Tahoe",
      daysLeft: 43,
    });
    expect(rendered.subject).toContain("nervous");
    expect(rendered.text).toContain("Mom's Tahoe");
    expect(rendered.tone).toBe("friendly");
  });

  it("escalates copy for day-of and post-expiration", () => {
    const dayOf = getNotificationTemplate("reminder_0");
    expect(dayOf.tone).toBe("urgent");
    expect(dayOf.subject).toContain("TODAY");

    const expired = renderNotificationTemplate("post_expiration", {
      vehicleName: "Mom's Tahoe",
      daysAfter: 12,
    });
    expect(expired.tone).toBe("critical");
    expect(expired.text).toContain("12 days");
    expect(expired.subject).toContain("expired");
  });

  it("supports dynamic reminder_N keys from custom state schedules", () => {
    const tmpl = getNotificationTemplate("reminder_45");
    expect(tmpl.key).toBe("reminder_45");
    expect(tmpl.tone).toBe("friendly");
    const rendered = renderNotificationTemplate("reminder_45", {
      vehicleName: "Beater Civic",
      daysLeft: 45,
    });
    expect(rendered.text).toContain("Beater Civic");
    expect(rendered.text).toContain("45");
  });

  it("maps days to template keys", () => {
    expect(reminderTemplateKeyForDays(90)).toBe("reminder_90");
    expect(reminderTemplateKeyForDays(-6)).toBe("post_expiration");
  });
});
