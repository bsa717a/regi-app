"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

export function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? DEFAULT_SIGNED_IN_HOME : "/login");
  }, [loading, user, router]);

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <p className="text-3xl font-semibold tracking-tight text-slate-900">REGI</p>
      <p className="mt-3 text-sm text-slate-600">
        {loading ? "Starting up…" : "Redirecting…"}
      </p>
    </main>
  );
}
