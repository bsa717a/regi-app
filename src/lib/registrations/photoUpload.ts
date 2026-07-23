import {
  ApiError,
  confirmRegistrationPhoto,
  deleteRegistrationPhoto,
  putFileToSignedUrl,
  requestRegistrationPhotoUploadUrl,
} from "@/lib/api/client";
import {
  compressImageFile,
  inferImageContentType,
} from "@/lib/images/compress";
import {
  isAllowedPhotoContentType,
  type AllowedPhotoContentType,
} from "@/lib/registrations/photoTypes";
import type { RegistrationDto } from "@/lib/registrations/types";

function preparePhotoUploadFile(file: File): {
  file: File;
  contentType: AllowedPhotoContentType;
} {
  const inferred = inferImageContentType(file);
  if (!inferred || !isAllowedPhotoContentType(inferred)) {
    throw new ApiError(
      "Unsupported image type. Allowed: JPEG, PNG, WebP, and HEIC.",
      400,
    );
  }

  const uploadFile =
    file.type.trim().toLowerCase() === inferred
      ? file
      : new File([file], file.name, {
          type: inferred,
          lastModified: file.lastModified,
        });

  return { file: uploadFile, contentType: inferred };
}

export async function uploadRegistrationPhoto(input: {
  token: string;
  registrationId: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<RegistrationDto> {
  const compressed = await compressImageFile(input.file);
  const { file: uploadFile, contentType } = preparePhotoUploadFile(compressed);

  const signed = await requestRegistrationPhotoUploadUrl(
    input.token,
    input.registrationId,
    {
      filename: uploadFile.name,
      contentType,
      contentLength: uploadFile.size,
    },
  );

  input.onProgress?.(0);
  await putFileToSignedUrl(
    signed.uploadUrl,
    uploadFile,
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
