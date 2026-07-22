"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-teal-600/20" />
          <p className="mt-4 text-sm text-slate-600">Checking your session…</p>
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
        <p className="text-sm text-slate-600">Redirecting to sign in…</p>
      </div>
    );
  }

  return children;
}
