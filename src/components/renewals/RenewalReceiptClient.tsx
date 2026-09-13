"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVaultDocumentPreview } from "@/components/documents/useVaultDocumentPreview";
import { RenewalReceipt } from "@/components/renewals/RenewalReceipt";
import { AppShell } from "@/components/shell/AppShell";
import { ApiError, getRenewal } from "@/lib/api/client";
import { buildRenewalProof } from "@/lib/renewals/proof";
import type { RenewalDto } from "@/lib/renewals/types";

export function RenewalReceiptClient({ renewalId }: { renewalId: string }) {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [renewal, setRenewal] = useState<RenewalDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const documentPreview = useVaultDocumentPreview(async () =>
    idToken ?? (await getIdToken()),
  );

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function run() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setRenewal(null);
            setLoading(false);
          }
          return;
        }
        const row = await getRenewal(token, renewalId);
        if (!cancelled) {
          setRenewal(row);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load this confirmation.",
          );
          setLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, renewalId, reloadKey]);

  const proof = renewal ? buildRenewalProof(renewal) : null;

  return (
    <AppShell title={proof ? `Confirmation · ${proof.vehicleLabel}` : "Confirmation"}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link
            href={
              renewal
                ? `/garage/${encodeURIComponent(renewal.registrationId)}/renewals`
                : "/garage"
            }
            className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
          >
            ← Renewal history
          </Link>
          {renewal ? (
            <Link
              href={`/renewals/${encodeURIComponent(renewal.id)}`}
              className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-teal-300"
            >
              Progress
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
            <p className="font-medium text-rose-900">{error}</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline"
              onClick={() => {
                setLoading(true);
                setReloadKey((k) => k + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {proof && renewal ? (
          <RenewalReceipt
            proof={proof}
            documents={renewal.documents}
            onViewDocument={documentPreview.open}
          />
        ) : null}
      </div>
      {documentPreview.modal}
    </AppShell>
  );
}
