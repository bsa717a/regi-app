import type { DocumentDto } from "@/lib/documents/types";
import { uploadDocumentToVault } from "@/lib/documents/clientUpload";
import { uploadRegistrationPhoto } from "@/lib/registrations/photoUpload";
import type { RegistrationDto } from "@/lib/registrations/types";

/**
 * Garage hero photo — lives on Registration.photoGcsPath only.
 * Never written to the document vault.
 */
export async function attachGaragePhoto(input: {
  token: string;
  registrationId: string;
  file: File;
}): Promise<RegistrationDto> {
  return uploadRegistrationPhoto(input);
}

/**
 * Registration card scan / photo — document vault only (type: registration).
 * Never used as the garage hero photo.
 */
export async function attachRegistrationDocument(input: {
  token: string;
  registrationId: string;
  file: File;
}): Promise<DocumentDto> {
  return uploadDocumentToVault({
    token: input.token,
    registrationId: input.registrationId,
    type: "registration",
    file: input.file,
  });
}
