import { formatUsdCents } from "@/lib/renewals/formatMoney";
import type { UtahPlateFeeEstimate } from "@/lib/plates/utah";

export function UtahPlateFeeEstimateCard({
  fees,
}: {
  fees: UtahPlateFeeEstimate;
}) {
  return (
    <section
      aria-labelledby="utah-plate-fee-heading"
      className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <h2
        id="utah-plate-fee-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        Fee estimate
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
          <span>Application fee</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatUsdCents(fees.applicationFeeCents)}
          </span>
        </li>
        <li className="flex justify-between gap-3 text-slate-700 dark:text-slate-300">
          <span>Processing fee</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatUsdCents(fees.processingFeeCents)}
          </span>
        </li>
        <li className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
          <span>Estimated initial total</span>
          <span>{formatUsdCents(fees.initialTotalCents)}</span>
        </li>
        <li className="flex justify-between gap-3 pt-1 text-slate-700 dark:text-slate-300">
          <span>Personalized plate renewal (each year)</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {formatUsdCents(fees.renewalFeeCents)}
          </span>
        </li>
      </ul>
      <p
        role="note"
        className="mt-3 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
      >
        {fees.disclaimer}
      </p>
      {fees.specialGroupNote ? (
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {fees.specialGroupNote}
        </p>
      ) : null}
    </section>
  );
}
