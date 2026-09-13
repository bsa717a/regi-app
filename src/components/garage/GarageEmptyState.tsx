import { GarageEmptyIllustration } from "@/components/garage/GarageEmptyIllustration";

export function GarageEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section
      className="flex min-h-[55vh] flex-col justify-center"
      data-testid="garage-empty-state"
      aria-labelledby="garage-empty-heading"
    >
      <GarageEmptyIllustration className="aspect-[5/3] w-full rounded-3xl border border-slate-200/80 bg-slate-50 shadow-sm dark:border-slate-700/80 dark:bg-slate-900" />
      <p className="mt-6 text-sm font-medium text-teal-800 dark:text-teal-300">
        Your garage
      </p>
      <h2
        id="garage-empty-heading"
        className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
      >
        Add your first registration
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
        Passenger vehicle, motorcycle, trailer, OHV, snowmobile, or boat —
        pick a type and we&apos;ll walk you through it in under 30 seconds.
      </p>
      <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 px-5 py-8 text-white shadow-lg shadow-teal-900/10">
        <p className="text-sm font-medium text-teal-100">Ready when you are</p>
        <p className="mt-2 text-xl font-semibold tracking-tight">
          Nobody should ever forget a registration again.
        </p>
        <button
          type="button"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3.5 text-base font-semibold text-teal-900 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={onAdd}
          data-testid="add-first-registration-button"
        >
          Add a registration
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already registered in Utah?{" "}
        <a
          href="/garage/plates"
          className="font-semibold text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
        >
          Plan a personalized plate
        </a>
      </p>
    </section>
  );
}
