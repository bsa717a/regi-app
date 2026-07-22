"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AuthPageShell,
  fieldClassName,
  labelClassName,
  linkClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";

function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/user-not-found":
        // Avoid account enumeration
        return "If an account exists for that email, a reset link is on the way.";
      default:
        return "Could not send a reset email. Please try again.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Could not send a reset email. Please try again.";
}

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Still show success for unknown user to reduce enumeration, except invalid email.
      if (
        err instanceof FirebaseError &&
        err.code === "auth/user-not-found"
      ) {
        setSent(true);
      } else {
        setError(mapAuthError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      title="Reset your password"
      subtitle="Enter your email and we’ll send a secure reset link."
      footer={
        <p>
          Remembered it?{" "}
          <Link href="/login" className={linkClassName}>
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-5 text-sm leading-relaxed text-teal-950">
          <p className="font-medium">Check your inbox</p>
          <p className="mt-1">
            If an account exists for that email, a password reset link is on the
            way.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className={labelClassName}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClassName}
              placeholder="you@email.com"
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
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthPageShell>
  );
}
