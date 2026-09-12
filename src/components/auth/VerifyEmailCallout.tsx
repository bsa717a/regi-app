"use client";

import { ResendVerificationEmailButton } from "@/components/auth/ResendVerificationEmailButton";

export function VerifyEmailCallout({
  email,
  testId = "verify-email-callout",
}: {
  email?: string | null;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900 dark:bg-amber-950/40"
      aria-labelledby="verify-email-heading"
    >
      <h2
        id="verify-email-heading"
        className="text-base font-semibold text-amber-950 dark:text-amber-100"
      >
        Confirm your email
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
        Verify {email ?? "your email"} to unlock renewals. Missed the email?
        Send a new verification link.
      </p>
      <div className="mt-3">
        <ResendVerificationEmailButton />
      </div>
    </section>
  );
}
