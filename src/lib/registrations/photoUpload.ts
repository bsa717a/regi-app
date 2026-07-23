import {
  ApiError,
  confirmRegistrationPhoto,
  deleteRegistrationPhoto,
  putFileToSignedUrl,
  requestRegistrationPhotoUploadUrl,
} from "@/lib/api/client";
import { compressImageFile } from "@/lib/images/compress";
import type { RegistrationDto } from "@/lib/registrations/types";

export async function uploadRegistrationPhoto(input: {
  token: string;
  registrationId: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<RegistrationDto> {
  const compressed = await compressImageFile(input.file);

  const signed = await requestRegistrationPhotoUploadUrl(
    input.token,
    input.registrationId,
    {
      filename: compressed.name,
      contentType: compressed.type,
      contentLength: compressed.size,
    },
  );

  input.onProgress?.(0);
  await putFileToSignedUrl(
    signed.uploadUrl,
    compressed,
    signed.requiredHeaders,
    (pct) => input.onProgress?.(Math.min(90, Math.round(pct * 0.9))),
  );

  input.onProgress?.(92);
  const registration = await confirmRegistrationPhoto(
    input.token,
    input.registrationId,
    { gcsPath: signed.gcsPath },
  );
  input.onProgress?.(100);
  return registration;
}

export async function removeRegistrationPhoto(input: {
  token: string;
  registrationId: string;
}): Promise<RegistrationDto> {
  return deleteRegistrationPhoto(input.token, input.registrationId);
}

export { ApiError };
