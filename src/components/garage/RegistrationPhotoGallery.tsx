"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { labelClassName } from "@/components/auth/AuthFormStyles";
import { RegistrationPhotoModal } from "@/components/garage/RegistrationPhotoModal";
import { inferImageContentType } from "@/lib/images/compress";
import { isAllowedPhotoContentType } from "@/lib/registrations/photoTypes";
import { MAX_REGISTRATION_PHOTOS } from "@/lib/registrations/photoConstants";
import type { RegistrationPhotoDto } from "@/lib/registrations/types";

export type GalleryPhotoItem = {
  key: string;
  url: string;
  isCover: boolean;
  savedPhotoId?: string;
  pendingIndex?: number;
  markedForRemoval?: boolean;
};

export function RegistrationPhotoGallery({
  savedPhotos,
  pendingAdds,
  pendingDeletes,
  coverKey,
  onPendingAddsChange,
  onPendingDeletesChange,
  onCoverKeyChange,
  disabled = false,
}: {
  savedPhotos: RegistrationPhotoDto[];
  pendingAdds: File[];
  pendingDeletes: Set<string>;
  coverKey: string | null;
  onPendingAddsChange: (files: File[]) => void;
  onPendingDeletesChange: (ids: Set<string>) => void;
  onCoverKeyChange: (key: string | null) => void;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  const pendingPreviewUrls = useMemo(() => {
    return pendingAdds.map((file) => URL.createObjectURL(file));
  }, [pendingAdds]);

  useEffect(() => {
    return () => {
      for (const url of pendingPreviewUrls) URL.revokeObjectURL(url);
    };
  }, [pendingPreviewUrls]);

  const initialCoverKey =
    savedPhotos.find((photo) => photo.isCover)?.id ??
    savedPhotos[0]?.id ??
    null;

  const items: GalleryPhotoItem[] = [
    ...savedPhotos
      .filter((photo) => !pendingDeletes.has(photo.id))
      .map((photo) => ({
        key: photo.id,
        url: photo.url,
        isCover: (coverKey ?? initialCoverKey) === photo.id,
        savedPhotoId: photo.id,
      })),
    ...pendingAdds.map((file, index) => ({
      key: `pending:${index}`,
      url: pendingPreviewUrls[index] ?? "",
      isCover: (coverKey ?? initialCoverKey) === `pending:${index}`,
      pendingIndex: index,
    })),
  ];

  const visibleCount = items.length;
  const canAddMore = visibleCount < MAX_REGISTRATION_PHOTOS;
  const previewItem = items.find((item) => item.key === previewKey) ?? null;

  function acceptFiles(fileList: FileList | null) {
    if (!fileList || disabled) return;

    const next = [...pendingAdds];
    for (const file of fileList) {
      if (visibleCount + (next.length - pendingAdds.length) >= MAX_REGISTRATION_PHOTOS) {
        break;
      }

      let contentType = inferImageContentType(file);
      if (!contentType && !file.name.includes(".")) {
        contentType = "image/jpeg";
      }
      if (!contentType || !isAllowedPhotoContentType(contentType)) continue;

      const normalized =
        file.type.trim().toLowerCase() === contentType
          ? file
          : new File([file], file.name, {
              type: contentType,
              lastModified: file.lastModified,
            });
      next.push(normalized);
    }

    if (next.length !== pendingAdds.length) {
      onPendingAddsChange(next);
      if (!coverKey && savedPhotos.length === 0 && pendingDeletes.size === 0) {
        onCoverKeyChange(`pending:0`);
      }
    }
  }

  function stageRemove(item: GalleryPhotoItem) {
    if (item.savedPhotoId) {
      const next = new Set(pendingDeletes);
      next.add(item.savedPhotoId);
      onPendingDeletesChange(next);
      if (coverKey === item.key) {
        const fallback = items.find(
          (candidate) =>
            candidate.key !== item.key &&
            (!candidate.savedPhotoId || !next.has(candidate.savedPhotoId)),
        );
        onCoverKeyChange(fallback?.key ?? null);
      }
    } else if (item.pendingIndex != null) {
      const nextFiles = pendingAdds.filter((_, index) => index !== item.pendingIndex);
      onPendingAddsChange(nextFiles);
      if (coverKey === item.key) {
        onCoverKeyChange(
          savedPhotos.find((photo) => !pendingDeletes.has(photo.id))?.id ?? null,
        );
      } else if (coverKey?.startsWith("pending:")) {
        const coverIndex = Number.parseInt(coverKey.split(":")[1] ?? "", 10);
        if (coverIndex > item.pendingIndex) {
          onCoverKeyChange(`pending:${coverIndex - 1}`);
        }
      }
    }
    setPreviewKey(null);
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
      <p className={labelClassName}>Garage photos</p>
      <p className="mt-1 text-xs text-slate-500">
        Up to {MAX_REGISTRATION_PHOTOS} photos. Tap a thumbnail to preview, set
        the cover, or remove. Changes apply when you save.
      </p>

      {items.length > 0 ? (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => setPreviewKey(item.key)}
                disabled={disabled}
                className="group relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail preview */}
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
                {item.isCover ? (
                  <span className="absolute bottom-1 left-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Cover
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No photos yet.</p>
      )}

      {canAddMore ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Take photo
          </button>
          <button
            type="button"
            onClick={() => libraryRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Choose from library
          </button>
        </div>
      ) : null}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <RegistrationPhotoModal
        open={previewItem != null}
        onClose={() => setPreviewKey(null)}
        imageUrl={previewItem?.url ?? ""}
        isCover={previewItem?.isCover ?? false}
        disabled={disabled}
        onSetCover={() => {
          if (previewItem) onCoverKeyChange(previewItem.key);
          setPreviewKey(null);
        }}
        onRemove={() => {
          if (previewItem) stageRemove(previewItem);
        }}
      />
    </div>
  );
}
