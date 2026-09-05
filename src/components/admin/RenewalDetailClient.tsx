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
import {
  fieldClassName,
  linkClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";

const cardClassName =
  "rounded-3xl border border-slate-200/80 bg-white p-4 text-sm dark:border-slate-700/80 dark:bg-slate-900";
const headingClassName =
  "mb-2 font-semibold text-slate-900 dark:text-slate-100";
const mutedClassName = "text-slate-600 dark:text-slate-400";
const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

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
    <AdminShell title="Renewal" activeTab="queue">
      <p className="mb-4 text-sm">
        <Link href="/admin?tab=queue" className={linkClassName}>
          ← Queue
        </Link>
      </p>

      {loading ? (
        <div
          className="h-28 animate-pulse rounded-3xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900"
          aria-busy
          aria-label="Loading renewal"
        />
      ) : null}
      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
          {message}
        </p>
      ) : null}

      {renewal ? (
        <div className="space-y-4">
          <section className={cardClassName}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
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
                <p className={mutedClassName}>
                  Plate {renewal.registration.plate || "—"} · VIN{" "}
                  {renewal.registration.vin || "—"} · {renewal.registration.state}
                </p>
                <p className={mutedClassName}>
                  Owner: {renewal.owner.name || "—"} ({renewal.owner.email})
                </p>
                <p className={mutedClassName}>
                  Registration expires{" "}
                  {renewal.registration.registrationExpiresOn}
                </p>
              </div>
              <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                {renewal.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
              </span>
            </div>
          </section>

          <section className={cardClassName}>
            <h3 className={headingClassName}>Actions</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy || !renewal.nextStatus}
                onClick={() => void onAdvanceStatus()}
                className={primaryButtonClassName}
              >
                {renewal.nextStatus
                  ? `Advance to ${renewal.nextStatus.replace(/([a-z])([A-Z])/g, "$1 $2")}`
                  : "No further status"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onResendEmail()}
                className={secondaryButtonClassName}
              >
                Resend status email
              </button>
              <button
                type="button"
                disabled
                title={renewal.refundNote}
                className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800"
              >
                Trigger refund — n/a (MVP)
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Payment status: {renewal.paymentStatus}
            </p>
          </section>

          <section className={cardClassName}>
            <h3 className={headingClassName}>Fee breakdown</h3>
            <ul className={`space-y-1 ${mutedClassName}`}>
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
              <li className="font-medium text-slate-900 dark:text-slate-100">
                Total (estimate):{" "}
                {formatUsdCents(renewal.feeBreakdown.totalCents)}
              </li>
            </ul>
          </section>

          <section className={cardClassName}>
            <h3 className={headingClassName}>Status history</h3>
            <ul className="space-y-1">
              {renewal.statusHistory.map((entry) => (
                <li
                  key={entry.status}
                  className="flex justify-between gap-3 text-slate-700 dark:text-slate-300"
                >
                  <span>
                    {entry.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {entry.at ? new Date(entry.at).toLocaleString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={cardClassName}>
            <h3 className={headingClassName}>Documents</h3>
            {renewal.documents.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">
                No documents uploaded.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {renewal.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {doc.type}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.originalFilename} ·{" "}
                        {new Date(doc.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {doc.downloadUrl ? (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={linkClassName}
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

          <section className={cardClassName}>
            <h3 className={headingClassName}>Staff notes</h3>
            <pre className="mb-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {renewal.staffNotes || "(none)"}
            </pre>
            <form onSubmit={onAddNote} className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a staff note…"
                className={`${fieldClassName} mt-0`}
              />
              <button
                type="submit"
                disabled={busy || !note.trim()}
                className={primaryButtonClassName}
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
