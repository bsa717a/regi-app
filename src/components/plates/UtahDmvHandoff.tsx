import {
  UTAH_GET_TO_PAYMENT_STEPS,
  UTAH_MVP_ORDER_PLATES_URL,
  UTAH_MVP_PLATE_STATUS_URL,
  UTAH_NO_PREFILL_NOTE,
  UTAH_PACKET_STAYS_OPEN_NOTE,
  UTAH_PERSONALIZED_PLATES_INFO_URL,
} from "@/lib/plates/utah";

export function UtahDmvHandoff() {
  return (
    <section
      aria-labelledby="utah-get-to-payment-heading"
      data-testid="utah-get-to-payment"
      className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <h2
        id="utah-get-to-payment-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        Get to payment
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {UTAH_PACKET_STAYS_OPEN_NOTE} Optional paper form TC-817 is not required
        if you apply in MVP.
      </p>
      <ol className="mt-4 space-y-3" data-testid="utah-get-to-payment-steps">
        {UTAH_GET_TO_PAYMENT_STEPS.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-900 dark:bg-teal-950/70 dark:text-teal-100"
            >
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {step.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {UTAH_NO_PREFILL_NOTE}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <a
          href={UTAH_MVP_ORDER_PLATES_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="utah-open-order-plates"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Open Order Plates
        </a>
        <a
          href={UTAH_MVP_PLATE_STATUS_URL}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="utah-plate-status-link"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Where is your plate?
        </a>
        <a
          href={UTAH_PERSONALIZED_PLATES_INFO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Open personalized plates info
        </a>
      </div>
    </section>
  );
}
