import type { ReactNode } from "react";

export function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_#f8fafc_45%,_#f1f5f9_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-24 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">
          REGI
        </p>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          {subtitle}
        </p>
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-8 text-sm text-slate-600">{footer}</div> : null}
      </div>
    </main>
  );
}

export const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20";

export const labelClassName = "block text-sm font-medium text-slate-700";

export const primaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60";

export const linkClassName =
  "font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700";
