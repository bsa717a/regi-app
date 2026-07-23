"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ApiError,
  adminAddRenewalNote,
  adminGetRenewal,
  adminResendRenewalEmail,
  adminUpdateRenewalStatus,
} from "@/lib/api/client";
import type { AdminRenewalDetail } from "@/lib/admin/types";
import { formatUsdCents } from "@/lib/renewals/formatMoney";

export function RenewalDetailClient({ renewalId }: { renewalId: string }) {
  const { getIdToken } = useAuth();
  const [renewal, setRenewal] = useState<AdminRenewalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    const token = await getIdToken();
    if (!token) throw new Error("Not signed in");
    const data = await adminGetRenewal(token, renewalId);
    setRenewal(data);
  }, [getIdToken, renewalId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load renewal",
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
  }, [reload]);

  async function withAction(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAdvanceStatus() {
    if (!renewal?.nextStatus) return;
    await withAction(async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const result = await adminUpdateRenewalStatus(
        token,
        renewalId,
        renewal.nextStatus!,
      );
      setMessage(`Status: ${result.previousStatus} → ${result.newStatus}`);
    });
  }

  async function onResendEmail() {
    await withAction(async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const result = await adminResendRenewalEmail(token, renewalId);
      setMessage(`Resent ${result.templateKey} to ${result.to}`);
    });
  }

  async function onAddNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    await withAction(async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      await adminAddRenewalNote(token, renewalId, note.trim());
      setNote("");
      setMessage("Note added");
    });
  }

  return (
    <AdminShell title="Renewal detail">
      <p className="mb-4 text-sm">
        <Link href="/admin/renewals" className="text-teal-800 underline">
          ← Queue
        </Link>
      </p>

      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : null}
      {error ? (
        <p className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {renewal ? (
        <div className="space-y-6">
          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {[
                    renewal.registration.year,
                    renewal.registration.make,
                    renewal.registration.model,
                  ]
                    .filter(Boolean)
                    .join(" ") || "Registration"}
                  {renewal.registration.nickname
                    ? ` — ${renewal.registration.nickname}`
                    : ""}
                </h2>
                <p className="text-slate-600">
                  Plate {renewal.registration.plate || "—"} · VIN{" "}
                  {renewal.registration.vin || "—"} · {renewal.registration.state}
                </p>
                <p className="text-slate-600">
                  Owner: {renewal.owner.name || "—"} ({renewal.owner.email})
                </p>
                <p className="text-slate-600">
                  Registration expires{" "}
                  {renewal.registration.registrationExpiresOn}
                </p>
              </div>
              <span className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                {renewal.status}
              </span>
            </div>
          </section>

          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <h3 className="mb-2 font-semibold text-slate-900">Actions</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !renewal.nextStatus}
                onClick={() => void onAdvanceStatus()}
                className="rounded bg-teal-800 px-3 py-2 text-white disabled:opacity-40"
              >
                {renewal.nextStatus
                  ? `Advance to ${renewal.nextStatus}`
                  : "No further status"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onResendEmail()}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-slate-800 disabled:opacity-40"
              >
                Resend status email
              </button>
              <button
                type="button"
                disabled
                title={renewal.refundNote}
                className="cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-400"
              >
                Trigger refund — n/a (MVP)
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Payment status: {renewal.paymentStatus}
            </p>
          </section>

          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <h3 className="mb-2 font-semibold text-slate-900">Fee breakdown</h3>
            <ul className="space-y-1 text-slate-700">
              <li>
                Registration:{" "}
                {formatUsdCents(renewal.feeBreakdown.registrationFeeCents)}
              </li>
              <li>
                REGI service:{" "}
                {formatUsdCents(renewal.feeBreakdown.regiServiceFeeCents)}
              </li>
              <li>
                Late fee: {formatUsdCents(renewal.feeBreakdown.lateFeeCents)}
              </li>
              <li className="font-medium">
                Total (estimate):{" "}
                {formatUsdCents(renewal.feeBreakdown.totalCents)}
              </li>
            </ul>
          </section>

          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <h3 className="mb-2 font-semibold text-slate-900">
              Status history
            </h3>
            <ul className="space-y-1">
              {renewal.statusHistory.map((entry) => (
                <li key={entry.status} className="flex justify-between gap-3">
                  <span>{entry.status}</span>
                  <span className="text-slate-500">
                    {entry.at
                      ? new Date(entry.at).toLocaleString()
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <h3 className="mb-2 font-semibold text-slate-900">Documents</h3>
            {renewal.documents.length === 0 ? (
              <p className="text-slate-500">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {renewal.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="font-medium">{doc.type}</p>
                      <p className="text-xs text-slate-500">
                        {doc.originalFilename} ·{" "}
                        {new Date(doc.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {doc.downloadUrl ? (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-teal-900"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">
                        URL unavailable
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded border border-slate-300 bg-white p-4 text-sm">
            <h3 className="mb-2 font-semibold text-slate-900">Staff notes</h3>
            <pre className="mb-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-800">
              {renewal.staffNotes || "(none)"}
            </pre>
            <form onSubmit={onAddNote} className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a staff note…"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !note.trim()}
                className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-40"
              >
                Add note
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
