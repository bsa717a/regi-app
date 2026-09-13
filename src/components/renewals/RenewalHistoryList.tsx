"use client";

import Link from "next/link";
import { renewalStatusLabel } from "@/lib/renewals/labels";
import type { RenewalDto } from "@/lib/renewals/types";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function historyDate(renewal: RenewalDto): string {
  return (
    renewal.timestamps.stickerMailedAt ??
    renewal.timestamps.completedAt ??
    renewal.timestamps.requestedAt
  );
}

export function RenewalHistoryList({ renewals }: { renewals: RenewalDto[] }) {
  if (renewals.length === 0) {
    return (
      <p
        data-testid="renewal-history-empty"
        className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
      >
        No concierge renewals yet for this registration. History and
        confirmation show up here after a renewal is requested — and a
        downloadable proof appears once the sticker is mailed.
      </p>
    );
  }

  return (
    <ul className="space-y-3" data-testid="renewal-history-list">
      {renewals.map((renewal) => (
        <li
          key={renewal.id}
          data-testid={`renewal-history-item-${renewal.id}`}
          className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {renewalStatusLabel(renewal.status)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {renewal.proofAvailable
                  ? `Sticker mailed ${formatWhen(renewal.timestamps.stickerMailedAt)}`
                  : `Started ${formatWhen(historyDate(renewal))}`}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {renewal.id}
              </p>
            </div>
            {renewal.proofAvailable ? (
              <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-900 ring-1 ring-inset ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-800">
                Proof ready
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                In progress
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href={`/renewals/${encodeURIComponent(renewal.id)}`}
              className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
            >
              View progress
            </Link>
            {renewal.proofAvailable ? (
              <Link
                href={`/renewals/${encodeURIComponent(renewal.id)}/receipt`}
                data-testid={`view-renewal-receipt-${renewal.id}`}
                className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
              >
                View confirmation
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
