"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function GuestGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";
      router.replace(safeNext);
    }
  }, [loading, user, router, searchParams]);

  if (loading) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  if (user) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600">Taking you to your dashboard…</p>
      </div>
    );
  }

  return children;
}
