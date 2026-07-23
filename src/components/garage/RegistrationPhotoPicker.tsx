"use client";

import { useEffect, useMemo, useRef } from "react";
import { labelClassName } from "@/components/auth/AuthFormStyles";
import { inferImageContentType } from "@/lib/images/compress";
import { isAllowedPhotoContentType } from "@/lib/registrations/photoTypes";

export function RegistrationPhotoPicker({
  currentPhotoUrl,
  pendingFile,
  onPendingFileChange,
  disabled = false,
}: {
  currentPhotoUrl?: string | null;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (!pendingFile) return null;
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl =
    previewUrl ?? (pendingFile === null ? (currentPhotoUrl ?? null) : null);
  const hasPhoto = Boolean(displayUrl);

  function acceptFile(file: File | undefined) {
    if (!file) return;

    let contentType = inferImageContentType(file);
    // Camera captures on mobile often omit both MIME type and file extension.
    if (!contentType && !file.name.includes(".")) {
      contentType = "image/jpeg";
    }
    if (!contentType || !isAllowedPhotoContentType(contentType)) return;

    const normalized =
      file.type.trim().toLowerCase() === contentType
        ? file
        : new File([file], file.name, {
            type: contentType,
            lastModified: file.lastModified,
          });
    onPendingFileChange(normalized);
  }

  return (
    <div>
      <p className={labelClassName}>
        Garage photo{" "}
        <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Shown on your garage card only — not saved to Documents.
      </p>

      {hasPhoto ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview blob or signed URL */}
            <img
              src={displayUrl!}
              alt="Vehicle photo preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            {currentPhotoUrl && !pendingFile ? (
              <a
                href={currentPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-teal-800 underline-offset-4 hover:underline"
              >
                View photo
              </a>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
              onClick={() => libraryRef.current?.click()}
            >
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
              onClick={() => onPendingFileChange(null)}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
            onClick={() => cameraRef.current?.click()}
          >
            Take photo
          </button>
          <button
            type="button"
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
            onClick={() => libraryRef.current?.click()}
          >
            Choose photo
          </button>
        </div>
      )}

      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
