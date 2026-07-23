"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  GarageDoorPanels,
  useGarageDoorReveal,
} from "@/components/auth/GarageDoorReveal";
import {
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

export function GarageDoorLogin() {
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const { armReveal, cancelReveal, revealTo, revealing } = useGarageDoorReveal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function destination(): string {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return "/dashboard";
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    // Arm before signIn so GuestGuard sees revealing=true when user becomes set.
    armReveal();
    try {
      await signIn(email, password);
      // Navigate under the closed door, then scroll up to reveal the app.
      revealTo(destination());
    } catch (err) {
      cancelReveal();
      setError(mapAuthError(err));
      setSubmitting(false);
    }
  }

  const busy = submitting || revealing;

  return (
    <main className="relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-black">
      <Image
        src="/images/garage-door.png"
        alt=""
        width={1200}
        height={1600}
        priority
        className="pointer-events-none absolute h-px w-px opacity-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <header className="mb-3 text-center sm:mb-4">
          <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            REGI
          </p>
          <p className="mt-1.5 text-sm text-neutral-400 sm:text-base">
            Pull in. We&apos;ll keep the stickers honest.
          </p>
        </header>

        <div className="relative mx-auto aspect-[3/4] w-full max-h-[min(78dvh,720px)] flex-1 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
          <div className="absolute inset-0 overflow-hidden bg-black ring-1 ring-neutral-800">
            <GarageDoorPanels className="absolute inset-0" />

            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 bg-amber-400/90 shadow-[0_0_24px_6px_rgba(251,191,36,0.55)]"
            />

            <div className="absolute inset-0 z-30 flex items-center justify-center px-5 py-8 sm:px-8">
              <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/50 p-5 shadow-2xl backdrop-blur-[6px] sm:p-6">
                <h1 className="text-xl font-semibold tracking-tight text-white">
                  Open the garage
                </h1>
                <p className="mt-1 text-sm text-neutral-300">
                  Sign in to check expirations and renewals.
                </p>

                <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="email"
                      className={`${labelClassName} text-neutral-200`}
                    >
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
                      className={`${fieldClassName} border-neutral-500/50 bg-white/95`}
                      placeholder="you@email.com"
                      disabled={busy}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label
                        htmlFor="password"
                        className={`${labelClassName} text-neutral-200`}
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className={`${linkClassName} text-sm text-teal-200 hover:text-teal-100`}
                      >
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
                      className={`${fieldClassName} border-neutral-500/50 bg-white/95`}
                      placeholder="Your password"
                      disabled={busy}
                    />
                  </div>

                  {error ? (
                    <p
                      className="rounded-xl bg-red-950/85 px-3 py-2 text-sm text-red-100 ring-1 ring-red-400/40"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    className={primaryButtonClassName}
                    disabled={busy}
                  >
                    {revealing
                      ? "Opening…"
                      : submitting
                        ? "Checking keys…"
                        : "Open garage"}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-neutral-300">
                  New to REGI?{" "}
                  <Link
                    href="/signup"
                    className={`${linkClassName} text-teal-200 hover:text-teal-100`}
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
