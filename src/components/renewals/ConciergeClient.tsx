"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { DocumentType } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
} from "@/components/auth/AuthFormStyles";
import { AppShell } from "@/components/shell/AppShell";
import { FeeEstimate } from "@/components/renewals/FeeEstimate";
import { ProgressTracker } from "@/components/renewals/ProgressTracker";
import {
  ApiError,
  createRenewal,
  getRenewal,
  submitRenewal,
} from "@/lib/api/client";
import { MAX_UPLOAD_BYTES } from "@/lib/documents/constants";
import { uploadDocumentToVault } from "@/lib/documents/clientUpload";
import type { RenewalDto, RequiredDocumentStatus } from "@/lib/renewals/types";
import { titleCaseMakeModel } from "@/lib/registrations/illustrations";

function vehicleLabel(renewal: RenewalDto): string {
  const v = renewal.registration;
  if (v.nickname?.trim()) return v.nickname.trim();
  const parts = [
    v.year,
    titleCaseMakeModel(v.make),
    titleCaseMakeModel(v.model),
  ]
    .filter(Boolean)
    .join(" ");
  return parts || "Registration";
}

function isPostSubmit(status: RenewalDto["status"]): boolean {
  return status !== "Requested";
}

export function ConciergeClient({ renewalId }: { renewalId: string }) {
  const { user, idToken, getIdToken, loading: authLoading } = useAuth();
  const [renewal, setRenewal] = useState<RenewalDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countySaving, setCountySaving] = useState(false);

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
              : "Could not load this renewal.",
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

  async function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function handleCountyChange(county: string) {
    if (!renewal) return;
    setCountySaving(true);
    setSubmitError(null);
    try {
      const token = idToken ?? (await getIdToken());
      if (!token) throw new ApiError("Not signed in", 401);
      const { renewal: next } = await createRenewal(token, {
        registrationId: renewal.registrationId,
        county,
      });
      setRenewal(next);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Could not update county.",
      );
    } finally {
      setCountySaving(false);
    }
  }

  async function handleSubmit() {
    if (!renewal) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (user && !user.emailVerified) {
        throw new ApiError(
          "Verify your email before submitting a renewal. Check your inbox for a confirmation link.",
          403,
        );
      }
      const token = idToken ?? (await getIdToken(true));
      if (!token) throw new ApiError("Not signed in", 401);
      const next = await submitRenewal(token, renewal.id);
      setRenewal(next);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "Could not submit renewal. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const title = renewal ? `Renew ${vehicleLabel(renewal)}` : "Renewal";

  return (
    <AppShell
      title={title}
      action={
        <Link
          href="/dashboard"
          className="rounded-xl px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Done
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-4" aria-busy aria-label="Loading renewal">
          <div className="h-24 animate-pulse rounded-3xl bg-gradient-to-br from-teal-100 via-slate-100 to-slate-200" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
          <p className="font-medium text-rose-900">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline"
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loading && renewal && !renewal.registration.canEdit ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-5">
            <p className="text-sm font-medium text-slate-700">Shared · view only</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {vehicleLabel(renewal)}
            </h2>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              You can follow renewal progress. Only the household owner can
              upload documents or submit.
            </p>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              onClick={refresh}
            >
              Refresh status
            </button>
          </section>
          <section aria-labelledby="viewer-progress-heading">
            <h2
              id="viewer-progress-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              Progress
            </h2>
            <div className="mt-3 rounded-3xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm">
              <ProgressTracker
                status={renewal.status}
                workflow={renewal.workflow}
                timestamps={renewal.timestamps}
              />
            </div>
          </section>
        </div>
      ) : null}

      {!loading && renewal && renewal.registration.canEdit ? (
        isPostSubmit(renewal.status) ? (
          <SubmittedView renewal={renewal} onRefresh={refresh} />
        ) : (
          <DraftView
            renewal={renewal}
            emailVerified={Boolean(user?.emailVerified)}
            submitting={submitting}
            submitError={submitError}
            countySaving={countySaving}
            onCountyChange={handleCountyChange}
            onUploaded={async () => {
              await refresh();
            }}
            onSubmit={handleSubmit}
            getToken={async () => idToken ?? (await getIdToken())}
          />
        )
      ) : null}
    </AppShell>
  );
}

function SubmittedView({
  renewal,
  onRefresh,
}: {
  renewal: RenewalDto;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 px-4 py-5">
        <p className="text-sm font-medium text-teal-800">You&apos;re all set</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          We&apos;re on it for {vehicleLabel(renewal)}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          Sit back — REGI&apos;s concierge will handle the rest. Watch the
          tracker below for updates.
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-teal-800 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          onClick={onRefresh}
        >
          Refresh status
        </button>
      </section>

      <section aria-labelledby="progress-heading">
        <h2
          id="progress-heading"
          className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
        >
          Progress
        </h2>
        <div className="mt-3 rounded-3xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm">
          <ProgressTracker
            status={renewal.status}
            workflow={renewal.workflow}
            timestamps={renewal.timestamps}
          />
        </div>
      </section>

      <FeeEstimate fees={renewal.feeBreakdown} />
    </div>
  );
}

function DraftView({
  renewal,
  emailVerified,
  submitting,
  submitError,
  countySaving,
  onCountyChange,
  onUploaded,
  onSubmit,
  getToken,
}: {
  renewal: RenewalDto;
  emailVerified: boolean;
  submitting: boolean;
  submitError: string | null;
  countySaving: boolean;
  onCountyChange: (county: string) => Promise<void>;
  onUploaded: () => Promise<void>;
  onSubmit: () => Promise<void>;
  getToken: () => Promise<string | null>;
}) {
  const missingCount = renewal.missingDocumentTypes.length;
  const county = renewal.feeBreakdown.county ?? "";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-teal-800">Registration concierge</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Renew {vehicleLabel(renewal)}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          Upload the required docs (about 5 minutes), review the fee estimate,
          and submit — no payment in this MVP.
        </p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {renewal.registration.countdown}
        </p>
      </section>

      {renewal.needsCounty ? (
        <section aria-labelledby="county-heading">
          <h2
            id="county-heading"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Registration county
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Some documents (like emissions) only apply in certain counties.
          </p>
          <label htmlFor="renewal-county" className={`${labelClassName} mt-3`}>
            County
          </label>
          <select
            id="renewal-county"
            className={fieldClassName}
            value={county}
            disabled={countySaving}
            onChange={(e) => {
              void onCountyChange(e.target.value);
            }}
          >
            <option value="">Select county</option>
            {renewal.countyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="Other">Other / not listed</option>
          </select>
        </section>
      ) : null}

      <section aria-labelledby="docs-heading">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="docs-heading"
            className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Required documents
          </h2>
          <p className="text-xs font-medium text-slate-500" aria-live="polite">
            {missingCount === 0
              ? "All set"
              : `${missingCount} still needed`}
          </p>
        </div>
        <ul className="mt-3 space-y-3">
          {renewal.requiredDocuments.map((doc) => (
            <li key={doc.type}>
              <DocumentUploadSlot
                renewal={renewal}
                requirement={doc}
                getToken={getToken}
                onUploaded={onUploaded}
              />
            </li>
          ))}
        </ul>
        {renewal.requiredDocuments.length === 0 ? (
          <p className="mt-3 rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
            No required documents for this configuration. You can submit when
            ready.
          </p>
        ) : null}
      </section>

      <FeeEstimate fees={renewal.feeBreakdown} />

      {!emailVerified ? (
        <p
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
        >
          Confirm your email before submitting. You can keep uploading documents
          in the meantime.
        </p>
      ) : null}

      {submitError ? (
        <p role="alert" className="text-sm text-rose-700">
          {submitError}
        </p>
      ) : null}

      <button
        type="button"
        className={primaryButtonClassName}
        disabled={
          submitting ||
          !renewal.documentsComplete ||
          !emailVerified ||
          (renewal.needsCounty && !county)
        }
        onClick={() => {
          void onSubmit();
        }}
      >
        {submitting ? "Submitting…" : "Submit renewal"}
      </button>
      <p className="text-center text-xs text-slate-500">
        No charge today — fees above are estimates only.
      </p>
    </div>
  );
}

function DocumentUploadSlot({
  renewal,
  requirement,
  getToken,
  onUploaded,
}: {
  renewal: RenewalDto;
  requirement: RequiredDocumentStatus;
  getToken: () => Promise<string | null>;
  onUploaded: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    try {
      const token = await getToken();
      if (!token) throw new ApiError("Not signed in", 401);
      await uploadDocumentToVault({
        token,
        registrationId: renewal.registrationId,
        type: requirement.type as DocumentType,
        file,
        renewalId: renewal.id,
        onProgress: setProgress,
      });
      await onUploaded();
      setProgress(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Upload failed. Please try again.",
      );
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  const maxMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

  return (
    <article
      aria-labelledby={labelId}
      className={`rounded-3xl border px-4 py-4 ${
        requirement.uploaded
          ? "border-teal-200 bg-teal-50/60"
          : "border-slate-200/80 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={labelId} className="font-semibold text-slate-900">
            {requirement.label}
          </h3>
          {requirement.notes ? (
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {requirement.notes}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            requirement.uploaded
              ? "bg-teal-700 text-white"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {requirement.uploaded ? "Uploaded" : "Needed"}
        </span>
      </div>

      <div
        className={`mt-4 rounded-2xl border-2 border-dashed px-3 py-4 text-center transition ${
          dragOver ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-slate-50/70"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFile(e.dataTransfer.files?.[0]);
        }}
      >
        <p className="text-sm text-slate-600">
          Photo or PDF · up to {maxMb} MB
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={uploading}
            className="rounded-xl bg-teal-700 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {requirement.uploaded ? "Replace / add" : "Choose file"}
          </button>
          <button
            type="button"
            disabled={uploading}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
            onClick={() => cameraRef.current?.click()}
          >
            Take photo
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void uploadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            void uploadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {progress !== null ? (
        <div className="mt-3" aria-live="polite">
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Uploading</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-teal-600 transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </article>
  );
}
