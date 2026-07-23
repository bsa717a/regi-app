"use client";

import { useEffect, useMemo } from "react";

/** Blob preview for a pending upload, otherwise the saved photo URL. */
export function usePhotoPreviewUrl(input: {
  pendingFile: File | null;
  currentPhotoUrl?: string | null;
  cleared?: boolean;
}): string | null {
  const objectUrl = useMemo(
    () => (input.pendingFile ? URL.createObjectURL(input.pendingFile) : null),
    [input.pendingFile],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (input.cleared) return null;
  return objectUrl ?? input.currentPhotoUrl ?? null;
}
