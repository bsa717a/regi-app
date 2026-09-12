import { UTAH_PLATE_REQUIREMENTS } from "@/lib/plates/utah";

export function UtahPlateRequirementsChecklist({
  heading = "Before you start",
}: {
  heading?: string;
}) {
  return (
    <section
      aria-labelledby="utah-plate-requirements-heading"
      className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
    >
      <h2
        id="utah-plate-requirements-heading"
        className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
      >
        {heading}
      </h2>
      <ul className="mt-3 space-y-3">
        {UTAH_PLATE_REQUIREMENTS.map((item) => (
          <li key={item.id} className="flex gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-200"
            >
              <CheckIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      className="stroke-current"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.2 3 3 6-6.4" />
    </svg>
  );
}
