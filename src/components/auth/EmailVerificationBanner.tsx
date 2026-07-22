"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified) {
    return null;
  }

  async function handleResend() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail();
      setMessage("Verification email sent. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification email.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Confirm your email to unlock renewals. You can keep browsing in the
          meantime.
        </p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={sending}
          className="shrink-0 rounded-lg bg-amber-900 px-3 py-2 text-left text-sm font-medium text-amber-50 transition hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:opacity-60 sm:text-center"
        >
          {sending ? "Sending…" : "Resend email"}
        </button>
      </div>
      {message ? <p className="mx-auto mt-2 max-w-3xl text-amber-900">{message}</p> : null}
      {error ? (
        <p className="mx-auto mt-2 max-w-3xl text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
