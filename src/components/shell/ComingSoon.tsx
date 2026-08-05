export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="flex min-h-[50vh] flex-col justify-center">
      <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <div
        className="mt-8 h-36 animate-pulse rounded-3xl bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200 dark:from-teal-950 dark:via-slate-900 dark:to-slate-950"
        aria-hidden
      />
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Coming soon in a later build.
      </p>
    </section>
  );
}
