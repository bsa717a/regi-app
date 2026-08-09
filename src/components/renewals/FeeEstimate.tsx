"use client";

import type { FeeBreakdown } from "@/lib/renewals/types";
import { formatUsdCents } from "@/lib/renewals/formatMoney";

export function FeeEstimate({ fees }: { fees: FeeBreakdown }) {
  return (
    <section
      aria-labelledby="fee-estimate-heading"
      className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <h2
        id="fee-estimate-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        Fee estimate
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
          <span>Registration fee</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatUsdCents(fees.registrationFeeCents)}
          </span>
        </li>
        <li className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
          <span>REGI service fee</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatUsdCents(fees.regiServiceFeeCents)}
          </span>
        </li>
        {fees.lateFeeCents > 0 ? (
          <li className="flex justify-between gap-3 text-rose-800 dark:text-rose-300">
            <span>Late fee</span>
            <span className="font-medium">
              {formatUsdCents(fees.lateFeeCents)}
            </span>
          </li>
        ) : null}
        <li className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>Estimated total</span>
          <span>{formatUsdCents(fees.totalCents)}</span>
        </li>
      </ul>
      <p
        role="note"
        className="mt-3 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
      >
        No payment required during MVP — you won&apos;t be charged yet. This is
        an informational estimate only.
      </p>
      {fees.notes ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {fees.notes}
        </p>
      ) : null}
    </section>
  );
}
