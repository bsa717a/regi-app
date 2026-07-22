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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ name, email, phone, password });
      router.replace("/dashboard");
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
        <p>
          Already have an account?{" "}
          <Link href="/login" className={linkClassName}>
            Sign in
          </Link>
        </p>
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthPageShell>
  );
}
