"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { RegiAssistant } from "@/components/regi/RegiAssistant";
import { BottomNav } from "@/components/shell/BottomNav";

export function AppShell({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#042f2e_0%,#020617_28%,#020617_100%)]">
        <EmailVerificationBanner />
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
                REGI
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
            </div>
            {action}
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-8">
          {children}
        </main>
        <BottomNav />
        <RegiAssistant />
      </div>
    </AuthGuard>
  );
}
