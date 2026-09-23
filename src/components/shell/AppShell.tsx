"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { RegiAssistant } from "@/components/regi/RegiAssistant";
import { RegiMark } from "@/components/brand/ui";
import { BottomNav, BottomNavBar } from "@/components/shell/BottomNav";

export function AppFrame({
  title,
  children,
  action,
  nav,
  showAssistant = true,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** Replaces router nav. Used by the brand preview. */
  nav?: ReactNode;
  showAssistant?: boolean;
}) {
  return (
    <div className="regi-flow flex min-h-full flex-1 flex-col bg-regi-ground text-regi-text">
      <EmailVerificationBanner />
      <header className="sticky top-0 z-10 bg-regi-ground px-4 pt-[max(0.85rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <RegiMark />
            <h1 className="truncate font-regi-display text-2xl font-bold tracking-[-0.01em] text-regi-text">
              {title}
            </h1>
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-2 pb-8">
        {children}
      </main>
      {nav ?? <BottomNav />}
      {showAssistant ? <RegiAssistant /> : null}
    </div>
  );
}

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
      <AppFrame title={title} action={action}>
        {children}
      </AppFrame>
    </AuthGuard>
  );
}

export function PreviewNav({
  activeHref,
  onNavigate,
}: {
  activeHref: string;
  onNavigate: (href: string) => void;
}) {
  return <BottomNavBar activeHref={activeHref} onNavigate={onNavigate} />;
}
