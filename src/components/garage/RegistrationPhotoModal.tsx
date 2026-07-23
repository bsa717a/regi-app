"use client";

import { useEffect, useId } from "react";
import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";

export function RegistrationPhotoModal({
  open,
  onClose,
  imageUrl,
  isCover,
  onSetCover,
  onRemove,
  disabled = false,
}: {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !disabled) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, disabled]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disabled) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 id={titleId} className="text-base font-semibold text-slate-900">
            Garage photo
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="max-h-[55vh] overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL preview */}
          <img
            src={imageUrl}
            alt="Garage photo preview"
            className="max-h-[55vh] w-full object-contain"
          />
        </div>

        <div className="space-y-2 border-t border-slate-200 px-4 py-4">
          {isCover ? (
            <p className="text-sm font-medium text-teal-800">
              This is the garage card cover photo.
            </p>
          ) : (
            <button
              type="button"
              onClick={onSetCover}
              disabled={disabled}
              className={`${primaryButtonClassName} w-full`}
            >
              Set as garage cover
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
          >
            Remove photo
          </button>
        </div>
      </div>
    </div>
  );
}
