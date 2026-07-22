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
      <p className="text-sm font-medium text-teal-800">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
        {description}
      </p>
      <div
        className="mt-8 h-36 animate-pulse rounded-3xl bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200"
        aria-hidden
      />
      <p className="mt-4 text-sm text-slate-500">Coming soon in a later build.</p>
    </section>
  );
}
