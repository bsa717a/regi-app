import {
  UTAH_MVP_URL,
  UTAH_NO_PREFILL_NOTE,
  UTAH_PERSONALIZED_PLATES_INFO_URL,
} from "@/lib/plates/utah";

export function UtahDmvHandoff() {
  return (
    <section
      aria-labelledby="utah-dmv-handoff-heading"
      className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <h2
        id="utah-dmv-handoff-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        Open Utah DMV
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {UTAH_NO_PREFILL_NOTE} Optional paper form TC-817 is not required if you
        apply in MVP.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <a
          href={UTAH_PERSONALIZED_PLATES_INFO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          Open personalized plates info
        </a>
        <a
          href={UTAH_MVP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
        >
          Open Utah MVP
        </a>
      </div>
    </section>
  );
}
