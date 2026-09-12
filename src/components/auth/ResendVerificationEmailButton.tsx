"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type ButtonVariant = "primary" | "link" | "banner";

const COOLDOWN_MS = 60_000;

export function ResendVerificationEmailButton({
  variant = "primary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
}) {
  const { resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const inCooldown = cooldownRemaining > 0;

  useEffect(() => {
    if (cooldownEnd === null) return;

    const endTime = cooldownEnd;

    function tick() {
      const remaining = Math.max(0, endTime - Date.now());
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        setCooldownEnd(null);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleResend = useCallback(async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      await resendVerificationEmail();
      setSent(true);
      setCooldownEnd(Date.now() + COOLDOWN_MS);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send verification email."
      );
    } finally {
      setSending(false);
    }
  }, [resendVerificationEmail]);

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);

  const baseClassName =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500"
      : variant === "banner"
        ? "shrink-0 rounded-lg bg-amber-900 px-3 py-2 text-left text-sm font-medium text-amber-50 transition hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100 dark:focus-visible:outline-amber-200 sm:text-center"
        : "text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 dark:text-teal-300";

  const buttonClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="resend-verification-email"
        onClick={() => void handleResend()}
        disabled={sending || inCooldown}
        className={buttonClassName}
      >
        {sending
          ? "Sending…"
          : inCooldown
            ? `Resend in ${cooldownSeconds}s`
            : "Resend verification email"}
      </button>
      {sent ? (
        <p className="text-sm text-teal-700 dark:text-teal-300">
          Verification email sent. Check your inbox and spam folder.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
