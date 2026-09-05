"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminTable } from "@/components/admin/AdminTable";
import { ApiError, adminSearch } from "@/lib/api/client";
import type { AdminSearchResult } from "@/lib/admin/types";
import { fieldClassName } from "@/components/auth/AuthFormStyles";

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
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, name, plate, VIN, nickname…"
          className={`${fieldClassName} mt-0 min-w-[16rem] flex-1`}
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-600"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Users ({result.users.length})
            </h2>
            {result.users.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No users matched.
              </p>
            ) : (
              <AdminTable headers={["Name", "Email", "Phone"]}>
                {result.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {u.name || "(no name)"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {u.phone || "—"}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Registrations ({result.registrations.length})
            </h2>
            {result.registrations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No registrations matched.
              </p>
            ) : (
              <AdminTable
                headers={["Vehicle", "Plate", "VIN", "State", "Expires", "Owner"]}
              >
                {result.registrations.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") ||
                        "Registration"}
                      {v.nickname ? ` (${v.nickname})` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {v.plate || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {v.vin || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                      {v.state}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                      {v.registrationExpiresOn}
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {v.owner ? v.owner.name || v.owner.email : "—"}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Search users by email/name and registrations by plate, VIN, or
          nickname.
        </p>
      )}
    </div>
  );
}
