"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import { AppShell } from "@/components/shell/AppShell";
import { ApiError, acceptHouseholdInvite } from "@/lib/api/client";

export function AcceptInviteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { getIdToken, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"working" | "done" | "error">(
    token ? "working" : "error",
  );
  const [error, setError] = useState<string | null>(
    token ? null : "This invite link is missing a token.",
  );
  const [householdName, setHouseholdName] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;

    let cancelled = false;

    async function run() {
      try {
        const idToken = await getIdToken();
        if (!idToken) {
          if (!cancelled) {
            setStatus("error");
            setError("Sign in to accept this household invite.");
          }
          return;
        }
        const result = await acceptHouseholdInvite(idToken, token);
        if (cancelled) return;
        setHouseholdName(result.household.name);
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not accept this invite. It may have expired.",
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, getIdToken, token]);

  return (
    <AppShell title="Household invite">
      {status === "working" ? (
        <div
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-busy
        >
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/80" />
          <p className="text-sm text-slate-600">Accepting your invite…</p>
        </div>
      ) : null}

      {status === "done" ? (
        <section className="rounded-3xl border border-teal-200 bg-teal-50/80 px-5 py-6">
          <p className="text-sm font-medium text-teal-800">You&apos;re in</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Joined {householdName ?? "the household"}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            You can view shared registrations, statuses, and documents. Renewals and
            edits stay with the household owner.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => router.push("/garage")}
            >
              Open garage
            </button>
            <Link
              href="/settings"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            >
              Household settings
            </Link>
          </div>
        </section>
      ) : null}

      {status === "error" ? (
        <section
          className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-6"
          role="alert"
        >
          <h2 className="text-xl font-semibold text-rose-950">
            Couldn&apos;t accept invite
          </h2>
          <p className="mt-2 text-sm text-rose-900">{error}</p>
          <Link
            href="/settings"
            className="mt-5 inline-flex text-sm font-semibold text-rose-900 underline-offset-4 hover:underline"
          >
            Back to settings
          </Link>
        </section>
      ) : null}
    </AppShell>
  );
}
