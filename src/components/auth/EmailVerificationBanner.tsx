"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { ResendVerificationEmailButton } from "@/components/auth/ResendVerificationEmailButton";

export function EmailVerificationBanner() {
  const { user } = useAuth();

  if (!user || user.emailVerified) {
    return null;
  }

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
      data-testid="email-verification-banner"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Confirm {user.email ?? "your email"} to unlock renewals. Use the
          Verify link in your inbox — we can&apos;t confirm an address from this
          page.
        </p>
        <ResendVerificationEmailButton variant="banner" />
      </div>
    </div>
  );
}
