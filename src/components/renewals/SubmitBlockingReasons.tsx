"use client";

import { ResendVerificationEmailButton } from "@/components/auth/ResendVerificationEmailButton";
import {
  getSubmitBlockingReasons,
  type SubmitBlockingInput,
} from "@/lib/renewals/submitBlockingReasons";

export function SubmitBlockingReasons(input: SubmitBlockingInput) {
  const reasons = getSubmitBlockingReasons(input);

  if (reasons.length === 0) {
    return null;
  }

  return (
    <div
      id="submit-blocking-reasons"
      data-testid="submit-blocking-reasons"
      className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/40"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        Complete these items to submit:
      </p>
      <ul className="space-y-1.5" aria-label="Blocking reasons">
        {reasons.map((reason) => (
          <li
            key={reason.key}
            className="flex items-start gap-2 text-sm text-amber-950 dark:text-amber-100"
          >
            <span
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            >
              •
            </span>
            <span>{reason.message}</span>
          </li>
        ))}
      </ul>
      {!input.emailVerified ? (
        <div className="pt-1">
          <ResendVerificationEmailButton variant="link" />
        </div>
      ) : null}
    </div>
  );
}
