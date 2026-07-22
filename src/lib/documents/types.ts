import type { DocumentType } from "@prisma/client";

export type DocumentDto = {
  id: string;
  vehicleId: string;
  renewalId: string | null;
  type: DocumentType;
  originalFilename: string;
  uploadedBy: string;
  createdAt: string;
};

export type UploadUrlResponse = {
  uploadUrl: string;
  gcsPath: string;
  requiredHeaders: Record<string, string>;
  expiresAt: string;
};

export type DownloadUrlResponse = {
  downloadUrl: string;
  expiresAt: string;
  filename: string;
  contentTypeHint: string | null;
};
