"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminTable } from "@/components/admin/AdminTable";
import { adminTabHref } from "@/components/admin/adminTabs";
import { ApiError, adminListRenewals } from "@/lib/api/client";
import type { AdminRenewalListItem } from "@/lib/admin/types";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";
import { linkClassName } from "@/components/auth/AuthFormStyles";

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "all", label: "All" },
  ...RENEWAL_STATUS_ORDER.map((s) => ({
    value: s,
    label: s.replace(/([a-z])([A-Z])/g, "$1 $2"),
  })),
];

export function RenewalQueueClient() {
  const { getIdToken } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get("status") || "active";
  const [renewals, setRenewals] = useState<AdminRenewalListItem[]>([]);
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
        const data = await adminListRenewals(
          token,
          status === "active" ? undefined : status,
        );
        if (!cancelled) setRenewals(data.renewals);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load queue",
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
  }, [getIdToken, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() =>
              router.replace(
                f.value === "active"
                  ? adminTabHref("queue")
                  : adminTabHref("queue", { status: f.value }),
              )
            }
            className={
              status === f.value
                ? "rounded-xl bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white dark:bg-teal-600"
                : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Loading queue…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        renewals.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No renewals in this filter.
          </p>
        ) : (
          <AdminTable
            headers={["Vehicle", "Status", "Owner", "Plate", "Expires", ""]}
          >
            {renewals.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                  {[
                    r.registration.year,
                    r.registration.make,
                    r.registration.model,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Registration"}
                  {r.registration.nickname
                    ? ` — ${r.registration.nickname}`
                    : ""}
                </td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                  {r.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                  {r.owner.name || r.owner.email}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                  {r.registration.plate || "—"}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                  {r.registration.registrationExpiresOn}
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/renewals/${r.id}`}
                    className={linkClassName}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        )
      ) : null}
    </div>
  );
}
