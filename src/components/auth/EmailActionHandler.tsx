"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AuthPageShell,
  fieldClassName,
  labelClassName,
  linkClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  isSafeContinueUrl,
  mapEmailActionError,
  parseEmailActionParams,
} from "@/lib/auth/emailAction";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

type Status = "ready" | "working" | "done" | "error";

function continueHref(continueUrl: string | null, fallback: string): string {
  return isSafeContinueUrl(continueUrl) ? (continueUrl as string) : fallback;
}

export function EmailActionHandler() {
  const searchParams = useSearchParams();
  const { user, refreshEmailVerification, resendVerificationEmail } = useAuth();
  const params = parseEmailActionParams({
    mode: searchParams.get("mode"),
    oobCode: searchParams.get("oobCode"),
    continueUrl: searchParams.get("continueUrl"),
  });

  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!params.mode || !params.oobCode) return;

    let cancelled = false;

    async function inspectCode() {
      try {
        const auth = getFirebaseAuth();
        if (params.mode === "resetPassword") {
          const email = await verifyPasswordResetCode(auth, params.oobCode);
          if (!cancelled) setAccountEmail(email);
          return;
        }
        const info = await checkActionCode(auth, params.oobCode);
        if (!cancelled) {
          setAccountEmail(info.data.email ?? info.data.previousEmail ?? null);
        }
      } catch {
        // Leave email unknown; the confirm action still reports a real error.
      }
    }

    void inspectCode();
    return () => {
      cancelled = true;
    };
  }, [params.mode, params.oobCode]);

  async function finishVerified() {
    const verified = await refreshEmailVerification();
    if (verified || !params.oobCode) {
      setStatus("done");
      setError(null);
      return true;
    }
    return false;
  }

  async function onVerify() {
    setStatus("working");
    setError(null);
    try {
      await applyActionCode(getFirebaseAuth(), params.oobCode);
      await refreshEmailVerification();
      setStatus("done");
    } catch (err) {
      const alreadyDone = await finishVerified();
      if (alreadyDone) return;
      setStatus("error");
      setError(mapEmailActionError(err));
    }
  }

  async function onRecover() {
    setStatus("working");
    setError(null);
    try {
      await applyActionCode(getFirebaseAuth(), params.oobCode);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(mapEmailActionError(err));
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("working");
    setError(null);
    try {
      await confirmPasswordReset(getFirebaseAuth(), params.oobCode, password);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(mapEmailActionError(err));
    }
  }

  async function onResend() {
    setResending(true);
    setResent(false);
    setError(null);
    try {
      const url = await resendVerificationEmail();
      window.location.assign(url);
      setResent(true);
    } catch (err) {
      setError(mapEmailActionError(err));
    } finally {
      setResending(false);
    }
  }

  if (!params.mode || !params.oobCode) {
    return (
      <AuthPageShell
        title="Email link"
        subtitle="This page completes verification and password-reset links from REGI."
        footer={
          <p>
            <Link href={user ? DEFAULT_SIGNED_IN_HOME : "/login"} className={linkClassName}>
              {user ? "Back to your garage" : "Back to sign in"}
            </Link>
          </p>
        }
      >
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          This link is missing the information needed to continue. Open the
          latest email from REGI and tap the button there.
        </p>
      </AuthPageShell>
    );
  }

  if (params.mode === "verifyEmail") {
    const homeHref = continueHref(
      params.continueUrl,
      user ? DEFAULT_SIGNED_IN_HOME : "/login",
    );
    return (
      <AuthPageShell
        title={status === "done" ? "Email confirmed" : "Confirm your email"}
        subtitle={
          status === "done"
            ? "You’re verified. Renewals and other locked actions are now available."
            : accountEmail
              ? `Confirm ${accountEmail} to finish setting up your account.`
              : "Confirm this email address to finish setting up your account."
        }
        footer={
          <p>
            <Link href={homeHref} className={linkClassName}>
              {user ? "Continue to your garage" : "Continue to sign in"}
            </Link>
          </p>
        }
      >
        {status === "done" ? (
          <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-5 text-sm leading-relaxed text-teal-950">
            Your email is verified.
          </p>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              className={primaryButtonClassName}
              disabled={status === "working"}
              onClick={() => void onVerify()}
            >
              {status === "working" ? "Confirming…" : "Verify email"}
            </button>
            {error ? (
              <div className="space-y-3">
                <p
                  className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </p>
                {user ? (
                  <button
                    type="button"
                    className={linkClassName}
                    disabled={resending}
                    onClick={() => void onResend()}
                  >
                    {resending ? "Sending…" : "Send a new verification email"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Sign in and use <span className="font-medium">Resend email</span>{" "}
                    to get a fresh link.
                  </p>
                )}
                {resent ? (
                  <p className="text-sm text-teal-800 dark:text-teal-300">
                    Verification email sent. Check your inbox.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </AuthPageShell>
    );
  }

  if (params.mode === "resetPassword") {
    return (
      <AuthPageShell
        title={status === "done" ? "Password updated" : "Choose a new password"}
        subtitle={
          status === "done"
            ? "You can sign in with your new password."
            : accountEmail
              ? `Set a new password for ${accountEmail}.`
              : "Set a new password for your REGI account."
        }
        footer={
          <p>
            <Link
              href={continueHref(params.continueUrl, "/login")}
              className={linkClassName}
            >
              Back to sign in
            </Link>
          </p>
        }
      >
        {status === "done" ? (
          <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-5 text-sm leading-relaxed text-teal-950">
            Your password has been updated.
          </p>
        ) : (
          <form onSubmit={onResetPassword} className="space-y-4" noValidate>
            <div>
              <label htmlFor="new-password" className={labelClassName}>
                New password
              </label>
              <input
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClassName}
                placeholder="At least 6 characters"
              />
            </div>
            {error ? (
              <p
                className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className={primaryButtonClassName}
              disabled={status === "working"}
            >
              {status === "working" ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title={status === "done" ? "Email restored" : "Undo email change"}
      subtitle={
        status === "done"
          ? "Your previous email address is active again."
          : accountEmail
            ? `Restore ${accountEmail} as the email on this account.`
            : "Restore the previous email address on this account."
      }
      footer={
        <p>
          <Link href={user ? DEFAULT_SIGNED_IN_HOME : "/login"} className={linkClassName}>
            {user ? "Back to your garage" : "Back to sign in"}
          </Link>
        </p>
      }
    >
      {status === "done" ? (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-5 text-sm leading-relaxed text-teal-950">
          Your email address has been restored.
        </p>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            className={primaryButtonClassName}
            disabled={status === "working"}
            onClick={() => void onRecover()}
          >
            {status === "working" ? "Restoring…" : "Restore email"}
          </button>
          {error ? (
            <p
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </AuthPageShell>
  );
}
