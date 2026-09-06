"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type ButtonVariant = "primary" | "link";

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
      : "text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 dark:text-teal-300";

  const buttonClassName = className
    ? `${baseClassName} ${className}`
    : baseClassName;

  return (
    <div className="space-y-2">
      <button
        type="button"
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
      {sent && !inCooldown ? (
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
