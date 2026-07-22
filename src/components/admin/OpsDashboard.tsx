"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError, adminGetStats } from "@/lib/api/client";
import type { AdminStatsDto } from "@/lib/admin/types";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";

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

  return (
    <AdminShell title="Ops dashboard">
      {loading ? (
        <p className="text-sm text-slate-600">Loading stats…</p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {stats ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBox label="Active queue" value={stats.activeQueueCount} />
            <StatBox label="Overdue queue" value={stats.overdueCount} highlight />
            <StatBox label="Total renewals" value={stats.total} />
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Renewals by status
            </h2>
            <div className="overflow-hidden rounded border border-slate-300 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Count</th>
                    <th className="px-3 py-2 font-medium">Queue</th>
                  </tr>
                </thead>
                <tbody>
                  {RENEWAL_STATUS_ORDER.map((status) => (
                    <tr key={status} className="border-t border-slate-200">
                      <td className="px-3 py-2">{friendlyStatus(status)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {stats.byStatus[status]}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/renewals?status=${status}`}
                          className="text-teal-800 underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-sm text-slate-600">
            Overdue = active renewals where the vehicle registration has already
            expired.{" "}
            <Link href="/admin/renewals" className="text-teal-800 underline">
              Open active queue
            </Link>
          </p>
        </div>
      ) : null}
    </AdminShell>
  );
}

function StatBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded border border-amber-400 bg-amber-50 px-3 py-3"
          : "rounded border border-slate-300 bg-white px-3 py-3"
      }
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
