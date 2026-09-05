export const ADMIN_TABS = [
  { id: "users", label: "Users" },
  { id: "ops", label: "Ops" },
  { id: "queue", label: "Queue" },
  { id: "search", label: "Search" },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

export function parseAdminTab(value: string | null): AdminTabId {
  return ADMIN_TABS.some((tab) => tab.id === value)
    ? (value as AdminTabId)
    : "users";
}

export function adminTabHref(
  tab: AdminTabId,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();
  if (tab !== "users") params.set("tab", tab);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}
