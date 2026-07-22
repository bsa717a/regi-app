"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const [staff, setStaff] = useState<AdminStaffDto | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const next = encodeURIComponent(pathname || "/admin");
      router.replace(`/login?next=${next}`);
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
          const next = encodeURIComponent(pathname || "/admin");
          router.replace(`/login?next=${next}`);
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
  }, [loading, user, idToken, getIdToken, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-slate-600">
          {loading ? "Checking staff access…" : "Redirecting to sign in…"}
        </p>
      </div>
    );
  }

  if (checking || (!staff && !forbidden)) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-slate-600">Checking staff access…</p>
      </div>
    );
  }

  if (forbidden || !staff) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-xl font-semibold text-slate-900">Not authorized</h1>
        <p className="mt-2 text-sm text-slate-600">
          This account is not on the staff allowlist. Contact an admin if you
          need portal access.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            Back to app
          </Link>
          <button
            type="button"
            onClick={() => void logOut()}
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
