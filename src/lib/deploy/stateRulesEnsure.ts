/**
 * Database-name guard for the non-prod Utah state-rules ensure.
 * Production database name is `regi`. This must never run there.
 */
export function assertNonProdStateRulesDatabase(databaseUrl: string): string {
  const raw = databaseUrl.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const withoutQuery = raw.split("?")[0] ?? "";
  const slash = withoutQuery.lastIndexOf("/");
  let name = slash < 0 ? "" : withoutQuery.slice(slash + 1);
  try {
    name = decodeURIComponent(name);
  } catch {
    // Keep the raw segment when it is not percent-encoded.
  }
  if (!name || name === "regi") {
    throw new Error(
      `Refusing state-rules ensure on database "${name || "(empty)"}"`,
    );
  }
  if (!/(staging|preview|pr_)/i.test(name)) {
    throw new Error(
      `Refusing state-rules ensure: database name "${name}" must include staging, preview, or pr_`,
    );
  }
  return name;
}
