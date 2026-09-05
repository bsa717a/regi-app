"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminTabHref } from "@/components/admin/adminTabs";
import { ApiError, adminGetStats } from "@/lib/api/client";
import type { AdminStatsDto } from "@/lib/admin/types";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";
import { linkClassName } from "@/components/auth/AuthFormStyles";

function friendlyStatus(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function OpsDashboard() {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not signed in");
        const data = await adminGetStats(token);
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load ops stats",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  if (loading) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Loading stats…
      </p>
    );
  }
  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </p>
    );
  }
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <AdminTable headers={["Metric", "Count"]}>
        <tr>
          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
            Active queue
          </td>
          <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">
            {stats.activeQueueCount}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
            Overdue queue
          </td>
          <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">
            {stats.overdueCount}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
            Total renewals
          </td>
          <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">
            {stats.total}
          </td>
        </tr>
      </AdminTable>

      <AdminTable headers={["Status", "Count", ""]}>
        {RENEWAL_STATUS_ORDER.map((status) => (
          <tr key={status}>
            <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
              {friendlyStatus(status)}
            </td>
            <td className="px-3 py-2 tabular-nums text-slate-700 dark:text-slate-300">
              {stats.byStatus[status]}
            </td>
            <td className="px-3 py-2">
              <Link
                href={adminTabHref("queue", { status })}
                className={linkClassName}
              >
                View
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
