import type { ReactNode } from "react";
import Link from "next/link";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#042f2e_0%,#020617_28%,#020617_100%)]">
      <header className="border-b border-slate-200/70 bg-white/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 dark:border-slate-700/70 dark:bg-slate-900/90">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300"
          >
            REGI
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Last updated {updated}
          </p>
        </div>
      </header>
      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-base leading-relaxed text-slate-700 dark:text-slate-300">
        {children}
        <p className="mt-10 text-sm text-slate-500 dark:text-slate-400">
          <Link
            href={PRIVACY_PATH}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Privacy Policy
          </Link>
          {" · "}
          <Link
            href={TERMS_PATH}
            className="font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Terms of Use
          </Link>
        </p>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
