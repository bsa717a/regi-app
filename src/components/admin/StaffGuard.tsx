"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, fetchAdminMe } from "@/lib/api/client";
import type { AdminStaffDto } from "@/lib/admin/types";

/**
 * Staff-only gate for /admin UI.
 * Reuses Firebase Auth; non-staff signed-in users see "not authorized".
 */
export function StaffGuard({ children }: { children: ReactNode }) {
  const { user, loading, idToken, getIdToken, logOut } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<AdminStaffDto | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    void (async () => {
      setChecking(true);
      setForbidden(false);
      setStaff(null);
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setForbidden(true);
            setChecking(false);
          }
          return;
        }
        const nextStaff = await fetchAdminMe(token);
        if (!cancelled) {
          setStaff(nextStaff);
          setChecking(false);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          setChecking(false);
          return;
        }
        setForbidden(true);
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user, idToken, getIdToken, router]);

  if (loading || !user) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-teal-600/20" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            {loading ? "Checking staff access…" : "Redirecting to sign in…"}
          </p>
        </div>
      </div>
    );
  }

  if (checking || (!staff && !forbidden)) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-teal-600/20" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Checking staff access…
          </p>
        </div>
      </div>
    );
  }

  if (forbidden || !staff) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">
          REGI
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Not authorized
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This account is not on the staff allowlist. Contact an admin if you
          need portal access.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/garage"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            Back to garage
          </Link>
          <button
            type="button"
            onClick={() => void logOut()}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
