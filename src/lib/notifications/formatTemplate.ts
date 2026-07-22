/**
 * Turn a notification template_key into short UI copy.
 * Keys are snake_case / kebab-case identifiers from the reminder engine.
 */
export function formatNotificationTitle(templateKey: string): string {
  const key = templateKey.trim();
  if (!key) return "Notification";

  const dayMatch = key.match(
    /(?:reminder[_-])?(\d+)[_-]?(?:day|days)?(?:[_-]before)?/i,
  );
  if (/expired|post[_-]?expiration|overdue/i.test(key)) {
    return "Registration expired reminder";
  }
  if (dayMatch?.[1]) {
    const days = dayMatch[1];
    if (days === "0" || /day[_-]?of|expires[_-]?today/i.test(key)) {
      return "Expires today reminder";
    }
    return `${days}-day renewal reminder`;
  }
  if (/welcome|onboarding/i.test(key)) return "Welcome to REGI";
  if (/renewal/i.test(key)) return "Renewal update";

  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

/**
 * Interpolate `{{var}}` placeholders in template strings.
 * Unknown / null / undefined variables become empty strings.
 */
export function formatTemplate(
  template: string,
  variables: Record<string, string | number | boolean | undefined | null> = {},
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}
