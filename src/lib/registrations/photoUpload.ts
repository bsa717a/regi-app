import {
  ApiError,
  confirmRegistrationPhoto,
  deleteRegistrationPhoto,
  putFileToSignedUrl,
  requestRegistrationPhotoUploadUrl,
  requestRegistrationPhotosUploadUrl,
  syncRegistrationPhotos,
} from "@/lib/api/client";
import {
  compressImageFile,
  inferImageContentType,
} from "@/lib/images/compress";
import {
  isAllowedPhotoContentType,
  type AllowedPhotoContentType,
} from "@/lib/registrations/photoTypes";
import { MAX_REGISTRATION_PHOTOS } from "@/lib/registrations/photoConstants";
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

export async function removeRegistrationPhoto(input: {
  token: string;
  registrationId: string;
}): Promise<RegistrationDto> {
  return deleteRegistrationPhoto(input.token, input.registrationId);
}

async function uploadPhotoFileToGcs(input: {
  token: string;
  registrationId: string;
  file: File;
  requestUploadUrl: typeof requestRegistrationPhotoUploadUrl;
}): Promise<string> {
  const compressed = await compressImageFile(input.file);
  const { file: uploadFile, contentType } = preparePhotoUploadFile(compressed);

  const signed = await input.requestUploadUrl(
    input.token,
    input.registrationId,
    {
      filename: uploadFile.name,
      contentType,
      contentLength: uploadFile.size,
    },
  );

  await putFileToSignedUrl(
    signed.uploadUrl,
    uploadFile,
    signed.requiredHeaders,
  );

  return signed.gcsPath;
}

async function uploadPhotoToRegistration(input: {
  token: string;
  registrationId: string;
  file: File;
  requestUploadUrl: typeof requestRegistrationPhotoUploadUrl;
  confirmUpload: typeof confirmRegistrationPhoto;
  onProgress?: (percent: number) => void;
}): Promise<RegistrationDto> {
  input.onProgress?.(0);
  const gcsPath = await uploadPhotoFileToGcs({
    token: input.token,
    registrationId: input.registrationId,
    file: input.file,
    requestUploadUrl: input.requestUploadUrl,
  });
  input.onProgress?.(92);
  const registration = await input.confirmUpload(
    input.token,
    input.registrationId,
    { gcsPath },
  );
  input.onProgress?.(100);
  return registration;
}

export async function uploadRegistrationPhoto(input: {
  token: string;
  registrationId: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<RegistrationDto> {
  return uploadPhotoToRegistration({
    ...input,
    requestUploadUrl: requestRegistrationPhotoUploadUrl,
    confirmUpload: confirmRegistrationPhoto,
  });
}

export { MAX_REGISTRATION_PHOTOS, ApiError };

export async function applyRegistrationPhotoChanges(input: {
  token: string;
  registrationId: string;
  deletePhotoIds: string[];
  addFiles: File[];
  coverPhotoId: string | null;
  pendingCoverIndex: number | null;
  initialCoverPhotoId: string | null;
}): Promise<RegistrationDto | null> {
  const hasChanges =
    input.deletePhotoIds.length > 0 ||
    input.addFiles.length > 0 ||
    (input.coverPhotoId != null &&
      input.coverPhotoId !== input.initialCoverPhotoId) ||
    input.pendingCoverIndex != null;

  if (!hasChanges) return null;

  const addGcsPaths: string[] = [];
  for (const file of input.addFiles) {
    addGcsPaths.push(
      await uploadPhotoFileToGcs({
        token: input.token,
        registrationId: input.registrationId,
        file,
        requestUploadUrl: requestRegistrationPhotosUploadUrl,
      }),
    );
  }

  return syncRegistrationPhotos(input.token, input.registrationId, {
    deletePhotoIds: input.deletePhotoIds,
    addGcsPaths,
    coverPhotoId: input.coverPhotoId,
    coverAddIndex: input.pendingCoverIndex,
  });
}
