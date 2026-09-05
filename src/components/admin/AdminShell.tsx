"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { StaffGuard } from "@/components/admin/StaffGuard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import type { AdminTabId } from "@/components/admin/adminTabs";

export function AdminShell({
  title,
  children,
  action,
  activeTab,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  activeTab?: AdminTabId;
}) {
  return (
    <StaffGuard>
      <div className="flex min-h-full flex-1 flex-col bg-[linear-gradient(180deg,#f0fdfa_0%,#f8fafc_28%,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#042f2e_0%,#020617_28%,#020617_100%)]">
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/90">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
                  REGI
                </p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h1>
              </div>
              {action ?? (
                <Link
                  href="/settings"
                  className="rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  Settings
                </Link>
              )}
            </div>
            {activeTab ? (
              <div className="mt-3">
                <AdminTabs active={activeTab} />
              </div>
            ) : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-8">
          <Link
            href="/settings"
            className="mb-4 inline-flex text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
          >
            ← Back to settings
          </Link>
          {children}
        </main>
      </div>
    </StaffGuard>
  );
}
