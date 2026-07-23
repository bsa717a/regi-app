import {
  confirmMaintenanceReceipt,
  putFileToSignedUrl,
  requestMaintenanceReceiptUploadUrl,
} from "@/lib/api/client";
import { prepareScanImage } from "@/lib/images/compress";

/** Compress, upload to GCS, and attach receipt to a maintenance log. */
export async function uploadMaintenanceReceipt(input: {
  token: string;
  registrationId: string;
  logId: string;
  file: File;
}): Promise<void> {
  const prepared = await prepareScanImage(input.file);
  const signed = await requestMaintenanceReceiptUploadUrl(
    input.token,
    input.registrationId,
    input.logId,
    {
      filename: prepared.file.name || "receipt.jpg",
      contentType: prepared.mimeType,
      contentLength: prepared.file.size,
    },
  );

  await putFileToSignedUrl(
    signed.uploadUrl,
    prepared.file,
    signed.requiredHeaders,
  );

  await confirmMaintenanceReceipt(
    input.token,
    input.registrationId,
    input.logId,
    {
      gcsPath: signed.gcsPath,
      filename: prepared.file.name || "receipt.jpg",
    },
  );
}
