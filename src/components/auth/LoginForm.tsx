"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
      case "auth/invalid-email":
        return "Email or password is incorrect.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a few minutes.";
      default:
        return "Could not sign in. Please try again.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Could not sign in. Please try again.";
}

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";
      router.replace(safeNext);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in to check expirations, renewals, and your garage."
      footer={
        <p>
          New to REGI?{" "}
          <Link href="/signup" className={linkClassName}>
            Create an account
          </Link>
        </p>
      }
    >
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
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClassName}>
              Password
            </label>
            <Link href="/forgot-password" className={`${linkClassName} text-sm`}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClassName}
            placeholder="Your password"
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={primaryButtonClassName}
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthPageShell>
  );
}
