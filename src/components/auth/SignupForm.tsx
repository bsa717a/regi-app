"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  AuthPageShell,
  fieldClassName,
  labelClassName,
  linkClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { LegalLinks } from "@/components/legal/LegalLinks";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/legal/constants";

function mapAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Use at least 6 characters for your password.";
      default:
        return "Could not create your account. Please try again.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Could not create your account. Please try again.";
}

export function SignupForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!agreed) {
      setError("Please agree to the Terms of Use and Privacy Policy.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp({ name, email, phone, password });
      router.replace(DEFAULT_SIGNED_IN_HOME);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      title="Create your account"
      subtitle="One screen. Under a minute. Then never miss a registration again."
      footer={
        <>
          <p>
            Already have an account?{" "}
            <Link href="/login" className={linkClassName}>
              Sign in
            </Link>
          </p>
          <LegalLinks className="mt-3" />
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className={labelClassName}>
            Name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClassName}
            placeholder="Alex Rivera"
          />
        </div>
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
          <label htmlFor="phone" className={labelClassName}>
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClassName}
            placeholder="(801) 555-0100"
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClassName}>
            Password
          </label>
          <input
            id="password"
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

        <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
          <input
            id="signup-agree"
            type="checkbox"
            required
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
          />
          <span>
            I agree to the{" "}
            <Link href={TERMS_PATH} className={linkClassName}>
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href={PRIVACY_PATH} className={linkClassName}>
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className={primaryButtonClassName}
          disabled={submitting || !agreed}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthPageShell>
  );
}
