"use client";

import { useState, type ReactNode } from "react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

export function TappableImagePreview({
  url,
  filename,
  title,
  categoryLabel = "Photo",
  className,
  children,
}: {
  url: string;
  filename: string;
  title: string;
  categoryLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={`View ${title}`}
      >
        {children}
      </button>
      <DocumentPreviewModal
        open={open}
        onClose={() => setOpen(false)}
        categoryLabel={categoryLabel}
        title={title}
        filename={filename}
        downloadUrl={url}
        kind="image"
        loading={false}
        error={null}
        onRetry={() => setOpen(true)}
      />
    </>
  );
}
