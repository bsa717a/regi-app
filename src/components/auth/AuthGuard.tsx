"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

const AUTH_GUARD_TIMEOUT_MS = 6_000;

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true);
    }, AUTH_GUARD_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || DEFAULT_SIGNED_IN_HOME);
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading && !timedOut) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-teal-600/20" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (loading && timedOut) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-sm text-center">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            We couldn&apos;t restore your sign-in. This can happen after an app
            update or if the browser blocked storage.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            onClick={() => {
              void logOut().finally(() => {
                const next = encodeURIComponent(pathname || DEFAULT_SIGNED_IN_HOME);
                router.replace(`/login?next=${next}`);
              });
            }}
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">Redirecting to sign in…</p>
      </div>
    );
  }

  return children;
}
