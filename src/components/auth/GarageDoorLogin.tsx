"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  GarageDoorPanels,
  useGarageDoorReveal,
} from "@/components/auth/GarageDoorReveal";
import {
  fieldClassName,
  onDarkLabelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { LegalLinks } from "@/components/legal/LegalLinks";
import {
  mapLoginError,
  type LoginErrorGuidance,
} from "@/lib/auth/mapLoginError";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

const forgotPasswordLinkClassName =
  "inline-flex min-h-11 items-center text-base font-semibold text-teal-200 underline decoration-teal-200/80 underline-offset-4 hover:text-teal-50 hover:decoration-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

const errorActionLinkClassName =
  "font-semibold text-white underline decoration-white/80 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function GarageDoorLogin() {
  const { signIn } = useAuth();
  const { armReveal, cancelReveal, revealTo, revealing } = useGarageDoorReveal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<LoginErrorGuidance | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    // Arm before signIn so GuestGuard sees revealing=true when user becomes set.
    armReveal();
    try {
      await signIn(email, password);
      // Always land in the garage after sign-in.
      revealTo(DEFAULT_SIGNED_IN_HOME);
    } catch (err) {
      cancelReveal();
      setError(mapLoginError(err));
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
          <p className="mt-1.5 text-sm text-slate-300 sm:text-base">
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
                <p className="mt-1 text-sm text-slate-200">
                  Sign in to check expirations and renewals.
                </p>

                <form
                  onSubmit={onSubmit}
                  className="mt-5 space-y-4"
                  noValidate
                  data-testid="login-form"
                >
                  <div>
                    <label htmlFor="email" className={onDarkLabelClassName}>
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
                      data-testid="login-email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className={onDarkLabelClassName}>
                      Password
                    </label>
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
                      data-testid="login-password"
                    />
                    <div className="mt-1.5">
                      <Link
                        href="/forgot-password"
                        className={forgotPasswordLinkClassName}
                        data-testid="login-forgot-password"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {error ? (
                    <div
                      className="rounded-xl bg-red-950/85 px-3 py-2.5 text-sm text-red-100 ring-1 ring-red-400/40"
                      role="alert"
                      data-testid="login-error"
                    >
                      <p>{error.message}</p>
                      {error.offerPasswordReset ? (
                        <p className="mt-2">
                          <Link
                            href="/forgot-password"
                            className={errorActionLinkClassName}
                            data-testid="login-error-forgot-password"
                          >
                            Reset your password
                          </Link>
                        </p>
                      ) : null}
                      {error.offerCreateAccount ? (
                        <p className="mt-2">
                          <Link
                            href="/signup"
                            className={errorActionLinkClassName}
                            data-testid="login-error-create-account"
                          >
                            Create an account
                          </Link>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className={primaryButtonClassName}
                    disabled={busy}
                    data-testid="login-submit"
                  >
                    {revealing
                      ? "Opening…"
                      : submitting
                        ? "Checking keys…"
                        : "Open garage"}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/10">
                  <p className="text-center text-sm font-medium text-white">
                    New to REGI?
                  </p>
                  <p className="mt-1 text-center text-xs text-slate-300">
                    Track your registrations in under a minute
                  </p>
                  <Link
                    href="/signup"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border-2 border-teal-400/70 bg-teal-400/10 px-4 py-3 text-base font-semibold text-teal-200 transition hover:border-teal-300 hover:bg-teal-400/20 hover:text-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                  >
                    Create account
                  </Link>
                </div>
                <LegalLinks className="mt-3 text-center text-sm [&_a]:text-teal-200 [&_a]:hover:text-teal-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
