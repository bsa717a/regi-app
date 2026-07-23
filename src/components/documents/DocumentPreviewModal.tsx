"use client";

import { useEffect, useId } from "react";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";

function isPdfFilename(filename: string): boolean {
  return filename.trim().toLowerCase().endsWith(".pdf");
}

function isImageFilename(filename: string): boolean {
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(filename.trim());
}

export function DocumentPreviewModal({
  open,
  onClose,
  title,
  filename,
  downloadUrl,
  loading,
  error,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  downloadUrl: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const pdf = isPdfFilename(filename);
  const image = !pdf && isImageFilename(filename);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
              Registration card
            </p>
            <h2
              id={titleId}
              className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Close
          </button>
        </div>

        <div className="min-h-[40vh] flex-1 overflow-auto bg-slate-100 p-4">
          {loading ? (
            <div className="flex h-full min-h-[40vh] items-center justify-center">
              <p className="text-sm text-slate-600">Loading preview…</p>
            </div>
          ) : null}

          {error ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm text-rose-700" role="alert">
                {error}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : null}

          {!loading && !error && downloadUrl && image ? (
            // Signed GCS URLs are ephemeral; next/image is not a fit here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={downloadUrl}
              alt={filename}
              className="mx-auto max-h-[70vh] w-auto max-w-full rounded-xl bg-white shadow-sm"
            />
          ) : null}

          {!loading && !error && downloadUrl && pdf ? (
            <iframe
              src={downloadUrl}
              title={filename}
              className="h-[70vh] w-full rounded-xl bg-white shadow-sm"
            />
          ) : null}

          {!loading && !error && downloadUrl && !image && !pdf ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-sm text-slate-600">
                Preview is not available for this file type.
              </p>
              <p className="text-sm text-slate-500">Use download to open the file.</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={filename}
              className={`${primaryButtonClassName} sm:w-auto`}
            >
              Download
            </a>
          ) : (
            <button
              type="button"
              disabled
              className={`${primaryButtonClassName} sm:w-auto`}
            >
              Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
