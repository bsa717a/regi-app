"use client";

import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";

const FEATURE_LABELS: Record<string, string> = {
  "renewal-concierge": "renewal concierge",
  renewal: "renewals",
  "document-upload": "document vault",
  "document-preview": "document preview",
  "scan-preview": "scan preview",
  "garage-upload": "garage photos",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature.replace(/-/g, " ");
}

export function FeatureErrorFallback({
  feature,
  onRetry,
}: {
  feature: string;
  onRetry?: () => void;
}) {
  const label = featureLabel(feature);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-slate-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-slate-100"
    >
      <p className="text-base font-semibold">Something went wrong in {label}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        You can try again. If this keeps happening, refresh the page.
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={`${primaryButtonClassName} mt-4 w-auto min-w-32`}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
