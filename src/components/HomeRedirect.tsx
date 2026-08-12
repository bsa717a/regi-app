"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

export function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (loading) return;
    router.replace(user ? DEFAULT_SIGNED_IN_HOME : "/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        REGI
      </p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        {loading ? "Starting up…" : "Redirecting…"}
      </p>
      {loading && slow ? (
        <button
          type="button"
          className="mt-6 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
          onClick={() => router.replace("/login")}
        >
          Continue to sign in
        </button>
      ) : null}
    </main>
  );
}
