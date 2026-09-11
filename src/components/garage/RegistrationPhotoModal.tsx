"use client";

import { primaryButtonClassName } from "@/components/auth/AuthFormStyles";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

export function RegistrationPhotoModal({
  open,
  onClose,
  imageUrl,
  filename = "garage-photo.jpg",
  isCover,
  onSetCover,
  onRemove,
  disabled = false,
}: {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  filename?: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <DocumentPreviewModal
      open={open}
      onClose={onClose}
      categoryLabel="Garage photo"
      title="Garage photo"
      filename={filename}
      downloadUrl={imageUrl || null}
      kind="image"
      loading={false}
      error={imageUrl ? null : "This photo is not available."}
      onRetry={onClose}
      closeDisabled={disabled}
      extraActions={
        <>
          {isCover ? (
            <p className="w-full text-sm font-medium text-teal-800 sm:mr-auto sm:w-auto">
              This is the garage card cover photo.
            </p>
          ) : (
            <button
              type="button"
              onClick={onSetCover}
              disabled={disabled}
              className={`${primaryButtonClassName} sm:w-auto`}
            >
              Set as garage cover
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-60"
          >
            Remove photo
          </button>
        </>
      }
    />
  );
}
