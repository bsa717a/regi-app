/**
 * Editable notification copy — keyed by template_key.
 * Change wording here without touching scheduling or dispatch code.
 */

import { formatTemplate } from "@/lib/notifications/formatTemplate";

export type TemplateTone = "friendly" | "nudge" | "urgent" | "critical";

export type NotificationTemplate = {
  key: string;
  subject: string;
  text: string;
  html: string;
  tone: TemplateTone;
};

export { formatTemplate };

/**
 * Pick tone from days-until-expiration (negative = already expired).
 * Used when selecting / validating escalating copy.
 */
export function toneForDaysUntil(daysUntilExpiration: number): TemplateTone {
  if (daysUntilExpiration < 0) return "critical";
  if (daysUntilExpiration <= 7) return "urgent";
  if (daysUntilExpiration <= 30) return "nudge";
  return "friendly";
}

/** Resolve which reminder template_key to use for a given days-until value. */
export function reminderTemplateKeyForDays(daysUntilExpiration: number): string {
  if (daysUntilExpiration < 0) return "post_expiration";
  return `reminder_${daysUntilExpiration}`;
}

const TEMPLATES: Record<string, NotificationTemplate> = {
  reminder_90: {
    key: "reminder_90",
    tone: "friendly",
    subject: "Heads up — {{vehicleName}} renews in {{daysLeft}} days",
    text: "No rush yet, but {{vehicleName}}'s registration sticker has {{daysLeft}} days of chill left. When you're ready, REGI can handle the renewal for you.",
    html: "<p>No rush yet, but <strong>{{vehicleName}}</strong>'s registration sticker has <strong>{{daysLeft}} days</strong> of chill left.</p><p>When you're ready, REGI can handle the renewal for you.</p>",
  },
  reminder_60: {
    key: "reminder_60",
    tone: "friendly",
    subject: "Your sticker is getting nervous — {{daysLeft}} days on {{vehicleName}}",
    text: "Your sticker is getting nervous. {{daysLeft}} days left on {{vehicleName}}. A little early planning now beats a DMV scramble later.",
    html: "<p>Your sticker is getting nervous. <strong>{{daysLeft}} days</strong> left on <strong>{{vehicleName}}</strong>.</p><p>A little early planning now beats a DMV scramble later.</p>",
  },
  reminder_30: {
    key: "reminder_30",
    tone: "nudge",
    subject: "{{vehicleName}}: {{daysLeft}} days until registration expires",
    text: "{{vehicleName}} renews in {{daysLeft}} days. REGI's concierge can gather the paperwork and get this done without the DMV line.",
    html: "<p><strong>{{vehicleName}}</strong> renews in <strong>{{daysLeft}} days</strong>.</p><p>REGI's concierge can gather the paperwork and get this done without the DMV line.</p>",
  },
  reminder_14: {
    key: "reminder_14",
    tone: "nudge",
    subject: "Two weeks out — {{vehicleName}} needs love",
    text: "Two weeks! {{vehicleName}} has {{daysLeft}} days left. Tap Renew in REGI and we'll take it from here.",
    html: "<p>Two weeks! <strong>{{vehicleName}}</strong> has <strong>{{daysLeft}} days</strong> left.</p><p>Tap Renew in REGI and we'll take it from here.</p>",
  },
  reminder_7: {
    key: "reminder_7",
    tone: "urgent",
    subject: "One week left on {{vehicleName}}",
    text: "Clock's ticking — {{vehicleName}} expires in {{daysLeft}} days. Renew now so you're not hunting stickers at the last minute.",
    html: "<p>Clock's ticking — <strong>{{vehicleName}}</strong> expires in <strong>{{daysLeft}} days</strong>.</p><p>Renew now so you're not hunting stickers at the last minute.</p>",
  },
  reminder_3: {
    key: "reminder_3",
    tone: "urgent",
    subject: "Uh-oh — {{vehicleName}} expires in {{daysLeft}} days",
    text: "Uh-oh. {{vehicleName}} expires in {{daysLeft}} days. This is your friendly-but-serious nudge from REGI.",
    html: "<p>Uh-oh. <strong>{{vehicleName}}</strong> expires in <strong>{{daysLeft}} days</strong>.</p><p>This is your friendly-but-serious nudge from REGI.</p>",
  },
  reminder_0: {
    key: "reminder_0",
    tone: "urgent",
    subject: "{{vehicleName}} expires TODAY",
    text: "Today's the day — {{vehicleName}}'s registration expires today. Open REGI and renew before the sticker turns into a pumpkin.",
    html: "<p>Today's the day — <strong>{{vehicleName}}</strong>'s registration expires <strong>today</strong>.</p><p>Open REGI and renew before the sticker turns into a pumpkin.</p>",
  },
  post_expiration: {
    key: "post_expiration",
    tone: "critical",
    subject: "{{vehicleName}} is expired ({{daysAfter}} days overdue)",
    text: "Alert: {{vehicleName}} has been expired for {{daysAfter}} days. Driving with an expired registration can mean tickets — renew with REGI ASAP.",
    html: "<p><strong>Alert:</strong> <strong>{{vehicleName}}</strong> has been expired for <strong>{{daysAfter}} days</strong>.</p><p>Driving with an expired registration can mean tickets — renew with REGI ASAP.</p>",
  },
  renewal_status_DocumentsReceived: {
    key: "renewal_status_DocumentsReceived",
    tone: "friendly",
    subject: "Got it — documents received for {{vehicleName}}",
    text: "Nice work. We have the documents for {{vehicleName}}. REGI staff will start reviewing soon — hang tight.",
    html: "<p>Nice work. We have the documents for <strong>{{vehicleName}}</strong>.</p><p>REGI staff will start reviewing soon — hang tight.</p>",
  },
  renewal_status_Reviewing: {
    key: "renewal_status_Reviewing",
    tone: "friendly",
    subject: "We're reviewing {{vehicleName}}'s renewal",
    text: "REGI is reviewing the paperwork for {{vehicleName}}. We'll nudge you when we move to the next step.",
    html: "<p>REGI is reviewing the paperwork for <strong>{{vehicleName}}</strong>.</p><p>We'll nudge you when we move to the next step.</p>",
  },
  renewal_status_Processing: {
    key: "renewal_status_Processing",
    tone: "friendly",
    subject: "Processing {{vehicleName}}'s renewal",
    text: "Docs look good — we're preparing the renewal submission for {{vehicleName}}.",
    html: "<p>Docs look good — we're preparing the renewal submission for <strong>{{vehicleName}}</strong>.</p>",
  },
  renewal_status_Submitted: {
    key: "renewal_status_Submitted",
    tone: "nudge",
    subject: "{{vehicleName}} renewal submitted to the state",
    text: "Submitted! {{vehicleName}}'s renewal is with the state/DMV. We'll update you when it's completed.",
    html: "<p>Submitted! <strong>{{vehicleName}}</strong>'s renewal is with the state/DMV.</p><p>We'll update you when it's completed.</p>",
  },
  renewal_status_Completed: {
    key: "renewal_status_Completed",
    tone: "friendly",
    subject: "{{vehicleName}} renewal is complete",
    text: "Great news — {{vehicleName}}'s registration renewal is complete. Sticker mailing is next.",
    html: "<p>Great news — <strong>{{vehicleName}}</strong>'s registration renewal is complete.</p><p>Sticker mailing is next.</p>",
  },
  renewal_status_StickerMailed: {
    key: "renewal_status_StickerMailed",
    tone: "friendly",
    subject: "Sticker mailed for {{vehicleName}}",
    text: "Your sticker is on the way for {{vehicleName}}. Keep an eye on the mailbox — and enjoy not thinking about the DMV.",
    html: "<p>Your sticker is on the way for <strong>{{vehicleName}}</strong>.</p><p>Keep an eye on the mailbox — and enjoy not thinking about the DMV.</p>",
  },
  household_invite: {
    key: "household_invite",
    tone: "friendly",
    subject: "You're invited to share {{householdName}} on REGI",
    text: "{{inviterEmail}} invited you to view registrations in {{householdName}} on REGI. Accept here (sign in with this email): {{inviteUrl}}",
    html: "<p><strong>{{inviterEmail}}</strong> invited you to view registrations in <strong>{{householdName}}</strong> on REGI.</p><p><a href=\"{{inviteUrl}}\">Accept the invite</a> — sign in with this email address.</p><p>As a viewer you can see registrations, statuses, and documents, and you'll get reminders. You won't be able to edit or renew.</p>",
  },
  maintenance_due: {
    key: "maintenance_due",
    tone: "nudge",
    subject: "{{vehicleName}}: {{taskName}} is due soon",
    text: "{{taskName}} on {{vehicleName}} is coming up — {{statusDetail}}. Open REGI to mark it done or update your hours/odometer: {{maintenanceUrl}}",
    html: "<p><strong>{{taskName}}</strong> on <strong>{{vehicleName}}</strong> is coming up — {{statusDetail}}.</p><p><a href=\"{{maintenanceUrl}}\">Open maintenance</a> to mark it done or update your hours/odometer.</p>",
  },
  maintenance_overdue: {
    key: "maintenance_overdue",
    tone: "urgent",
    subject: "{{vehicleName}}: {{taskName}} is overdue",
    text: "{{taskName}} on {{vehicleName}} is overdue — {{statusDetail}}. Catch up in REGI: {{maintenanceUrl}}",
    html: "<p><strong>{{taskName}}</strong> on <strong>{{vehicleName}}</strong> is overdue — {{statusDetail}}.</p><p><a href=\"{{maintenanceUrl}}\">Open maintenance</a> to log the service.</p>",
  },
  maintenance_usage_nudge: {
    key: "maintenance_usage_nudge",
    tone: "friendly",
    subject: "Update hours/miles for {{vehicleName}}",
    text: "It's been a while since you logged hours or miles for {{vehicleName}}. Update your reading so REGI can tell you when maintenance is due: {{maintenanceUrl}}",
    html: "<p>It's been a while since you logged hours or miles for <strong>{{vehicleName}}</strong>.</p><p><a href=\"{{maintenanceUrl}}\">Update your reading</a> so REGI can tell you when maintenance is due.</p>",
  },
  maintenance_scheduled: {
    key: "maintenance_scheduled",
    tone: "nudge",
    subject: "Reminder: {{taskName}} on {{vehicleName}}",
    text: "You asked REGI to remind you about {{taskName}} on {{vehicleName}}. Open maintenance to check it off or reschedule: {{maintenanceUrl}}",
    html: "<p>You asked REGI to remind you about <strong>{{taskName}}</strong> on <strong>{{vehicleName}}</strong>.</p><p><a href=\"{{maintenanceUrl}}\">Open maintenance</a> to check it off or set another reminder.</p>",
  },
};

/** Look up a template by key; falls back to a generic reminder template. */
export function getNotificationTemplate(templateKey: string): NotificationTemplate {
  const exact = TEMPLATES[templateKey];
  if (exact) return exact;

  // Dynamic keys like reminder_45 from a custom state schedule
  const dayMatch = templateKey.match(/^reminder_(\d+)$/);
  if (dayMatch) {
    const days = Number(dayMatch[1]);
    const tone = toneForDaysUntil(days);
    return {
      key: templateKey,
      tone,
      subject: "{{vehicleName}}: {{daysLeft}} days until registration expires",
      text: "{{vehicleName}} renews in {{daysLeft}} days. REGI is here when you're ready.",
      html: "<p><strong>{{vehicleName}}</strong> renews in <strong>{{daysLeft}} days</strong>.</p><p>REGI is here when you're ready.</p>",
    };
  }

  return {
    key: templateKey,
    tone: "friendly",
    subject: "REGI reminder: {{vehicleName}}",
    text: "You have a REGI reminder about {{vehicleName}}.",
    html: "<p>You have a REGI reminder about <strong>{{vehicleName}}</strong>.</p>",
  };
}

export function renderNotificationTemplate(
  templateKey: string,
  variables: Record<string, string | number | boolean | undefined | null>,
): { subject: string; text: string; html: string; tone: TemplateTone } {
  const tmpl = getNotificationTemplate(templateKey);
  return {
    subject: formatTemplate(tmpl.subject, variables),
    text: formatTemplate(tmpl.text, variables),
    html: formatTemplate(tmpl.html, variables),
    tone: tmpl.tone,
  };
}

export function listNotificationTemplateKeys(): string[] {
  return Object.keys(TEMPLATES);
}
