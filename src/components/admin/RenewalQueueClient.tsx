"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError, adminListRenewals } from "@/lib/api/client";
import type { AdminRenewalListItem } from "@/lib/admin/types";
import { RENEWAL_STATUS_ORDER } from "@/lib/renewals/status";

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
    <AdminShell title="Renewal queue">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() =>
              router.replace(
                f.value === "active"
                  ? "/admin/renewals"
                  : `/admin/renewals?status=${f.value}`,
              )
            }
            className={
              status === f.value
                ? "rounded bg-slate-900 px-2.5 py-1 text-xs text-white"
                : "rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading queue…</p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        renewals.length === 0 ? (
          <p className="text-sm text-slate-500">No renewals in this filter.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded border border-slate-300 bg-white">
            {renewals.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/renewals/${r.id}`}
                  className="block px-3 py-3 text-sm hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {[r.vehicle.year, r.vehicle.make, r.vehicle.model]
                        .filter(Boolean)
                        .join(" ") || "Vehicle"}
                      {r.vehicle.nickname
                        ? ` — ${r.vehicle.nickname}`
                        : ""}
                    </p>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600">
                    {r.owner.name || r.owner.email} · plate{" "}
                    {r.vehicle.plate || "—"} · expires{" "}
                    {r.vehicle.registrationExpiresOn}
                  </p>
                  <p className="text-xs text-slate-500">
                    Payment: {r.paymentStatus} · updated{" "}
                    {new Date(r.updatedAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </AdminShell>
  );
}
