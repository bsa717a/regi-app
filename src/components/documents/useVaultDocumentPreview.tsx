"use client";

import { useRef, useState } from "react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { ApiError, getDocumentDownloadUrl } from "@/lib/api/client";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/constants";
import type { DocumentDto } from "@/lib/documents/types";

export function useVaultDocumentPreview(
  getToken: () => Promise<string | null>,
) {
  const [previewDoc, setPreviewDoc] = useState<DocumentDto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestId = useRef(0);

  async function open(doc: DocumentDto) {
    const requestId = ++previewRequestId.current;
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename(doc.originalFilename);

    try {
      const token = await getToken();
      if (!token) throw new ApiError("Not signed in", 401);
      const signed = await getDocumentDownloadUrl(token, doc.id);
      if (requestId !== previewRequestId.current) return;
      setPreviewUrl(signed.downloadUrl);
      setPreviewFilename(signed.filename || doc.originalFilename);
    } catch (err) {
      if (requestId !== previewRequestId.current) return;
      setPreviewError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load document preview.",
      );
    } finally {
      if (requestId === previewRequestId.current) {
        setPreviewLoading(false);
      }
    }
  }

  function close() {
    previewRequestId.current += 1;
    setPreviewDoc(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename("");
  }

  const modal = previewDoc ? (
    <DocumentPreviewModal
      open
      onClose={close}
      categoryLabel={DOCUMENT_TYPE_LABELS[previewDoc.type] ?? previewDoc.type}
      title={previewFilename || previewDoc.originalFilename}
      filename={previewFilename || previewDoc.originalFilename}
      downloadUrl={previewUrl}
      loading={previewLoading}
      error={previewError}
      onRetry={() => void open(previewDoc)}
    />
  ) : null;

  return { open, close, previewDoc, modal };
}
