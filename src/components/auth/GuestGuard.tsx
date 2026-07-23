"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useGarageDoorReveal } from "@/components/auth/GarageDoorReveal";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

export function GuestGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { revealing } = useGarageDoorReveal();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // revealTo() owns navigation during the garage-door open sequence.
    if (!loading && user && !revealing) {
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : DEFAULT_SIGNED_IN_HOME;
      router.replace(safeNext);
    }
  }, [loading, user, revealing, router, searchParams]);

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

  // Door overlay is handling the transition — keep login mounted until navigate.
  if (user && revealing) {
    return children;
  }

  if (user) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-6 py-16"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-slate-600">Taking you to your garage…</p>
      </div>
    );
  }

  return children;
}
