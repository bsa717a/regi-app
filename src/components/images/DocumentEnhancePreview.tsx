"use client";

import { useEffect, useMemo, useState } from "react";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import type { PreparedScanImage } from "@/lib/images/compress";

export type DocumentEnhancePreviewProps = {
  open: boolean;
  title?: string;
  original: PreparedScanImage;
  enhanced: PreparedScanImage | null;
  enhanceError?: string | null;
  enhancing?: boolean;
  busy?: boolean;
  onConfirm: (chosen: PreparedScanImage) => void;
  onCancel: () => void;
};

/**
 * Before/after chooser for document scan enhancement.
 * Defaults to the enhanced scan when available.
 */
export function DocumentEnhancePreview({
  open,
  title = "Review scan",
  original,
  enhanced,
  enhanceError,
  enhancing = false,
  busy = false,
  onConfirm,
  onCancel,
}: DocumentEnhancePreviewProps) {
  const [useEnhanced, setUseEnhanced] = useState(Boolean(enhanced));

  useEffect(() => {
    setUseEnhanced(Boolean(enhanced));
  }, [enhanced]);

  const originalUrl = useMemo(
    () => URL.createObjectURL(original.file),
    [original.file],
  );
  const enhancedUrl = useMemo(
    () => (enhanced ? URL.createObjectURL(enhanced.file) : null),
    [enhanced],
  );

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(originalUrl);
      if (enhancedUrl) URL.revokeObjectURL(enhancedUrl);
    };
  }, [originalUrl, enhancedUrl]);

  if (!open) return null;

  const chosen = useEnhanced && enhanced ? enhanced : original;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enhance-preview-title"
    >
      <div className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div>
          <h3
            id="enhance-preview-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            We cleaned this up to look like a scan (crop, straighten, remove
            hands). Pick which version to keep.
          </p>
        </div>

        {enhancing ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
            Enhancing photo into a scan…
          </p>
        ) : null}

        {enhanceError && !enhanced ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          >
            {enhanceError} Using your original photo.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy || enhancing}
            onClick={() => setUseEnhanced(false)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              !useEnhanced
                ? "border-teal-600 ring-2 ring-teal-600/30"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalUrl}
              alt="Original photo"
              className="h-36 w-full object-cover"
            />
            <p className="px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
              Original
            </p>
          </button>
          <button
            type="button"
            disabled={busy || enhancing || !enhanced}
            onClick={() => enhanced && setUseEnhanced(true)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              useEnhanced && enhanced
                ? "border-teal-600 ring-2 ring-teal-600/30"
                : "border-slate-200 dark:border-slate-700"
            } ${!enhanced ? "opacity-60" : ""}`}
          >
            {enhancedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={enhancedUrl}
                alt="Enhanced scan"
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="flex h-36 items-center justify-center bg-slate-100 text-xs text-slate-500 dark:bg-slate-800">
                {enhancing ? "Working…" : "Unavailable"}
              </div>
            )}
            <p className="px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
              Scan
            </p>
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy || enhancing}
            onClick={() => onConfirm(chosen)}
            className={primaryButtonClassName}
          >
            Use this photo
          </button>
          <button
            type="button"
            disabled={busy || enhancing}
            onClick={onCancel}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
