"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import { ApiError, adminSearch } from "@/lib/api/client";
import type { AdminSearchResult } from "@/lib/admin/types";

export function AdminSearchClient() {
  const { getIdToken } = useAuth();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<AdminSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      setResult(await adminSearch(token, q));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Search failed",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Search">
      <form onSubmit={onSubmit} className="mb-6 flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, name, plate, VIN, nickname…"
          className="min-w-[16rem] flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Users ({result.users.length})
            </h2>
            {result.users.length === 0 ? (
              <p className="text-sm text-slate-500">No users matched.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded border border-slate-300 bg-white">
                {result.users.map((u) => (
                  <li key={u.id} className="px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">
                      {u.name || "(no name)"} — {u.email}
                    </p>
                    <p className="text-slate-500">
                      {u.phone || "no phone"} · {u.id}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800">
              Vehicles ({result.vehicles.length})
            </h2>
            {result.vehicles.length === 0 ? (
              <p className="text-sm text-slate-500">No vehicles matched.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded border border-slate-300 bg-white">
                {result.vehicles.map((v) => (
                  <li key={v.id} className="px-3 py-2 text-sm">
                    <p className="font-medium text-slate-900">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") ||
                        "Vehicle"}
                      {v.nickname ? ` (${v.nickname})` : ""}
                    </p>
                    <p className="text-slate-500">
                      Plate {v.plate || "—"} · VIN {v.vin || "—"} · {v.state} ·
                      expires {v.registrationExpiresOn}
                    </p>
                    {v.owner ? (
                      <p className="text-slate-500">
                        Owner: {v.owner.name || v.owner.email}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Search users by email/name and vehicles by plate, VIN, or nickname.
        </p>
      )}
    </AdminShell>
  );
}
