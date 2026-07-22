export type NotificationPrefs = {
  push: boolean;
  email: boolean;
  sms: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push: true,
  email: true,
  sms: false,
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Normalize JSON from the database into a typed prefs object. */
export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }

  const record = value as Record<string, unknown>;
  return {
    push: asBoolean(record.push, DEFAULT_NOTIFICATION_PREFS.push),
    email: asBoolean(record.email, DEFAULT_NOTIFICATION_PREFS.email),
    sms: asBoolean(record.sms, DEFAULT_NOTIFICATION_PREFS.sms),
  };
}

/** Merge a partial patch into existing prefs. SMS may be stored but is Phase 2. */
export function mergeNotificationPrefs(
  current: NotificationPrefs,
  patch: Partial<NotificationPrefs>,
): NotificationPrefs {
  return {
    push: typeof patch.push === "boolean" ? patch.push : current.push,
    email: typeof patch.email === "boolean" ? patch.email : current.email,
    // Allow storing the preference; sending remains Phase 2.
    sms: typeof patch.sms === "boolean" ? patch.sms : current.sms,
  };
}
