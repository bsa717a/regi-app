import type { MemberRole, Registration } from "@prisma/client";
import { loadStateRules } from "@/lib/stateEngine/loadRules";
import { resolvePhotoUrl } from "@/lib/registrations/photo";
import {
  loadRegistrationPhotos,
  serializeRegistrationPhotos,
} from "@/lib/registrations/registrationPhotos";
import { serializeRegistration } from "@/lib/registrations/serialize";
import type { RegistrationDto } from "@/lib/registrations/types";

export async function buildRegistrationDto(
  registration: Registration,
  householdRole: MemberRole,
  asOf: Date = new Date(),
): Promise<RegistrationDto | null> {
  const config = await loadStateRules(registration.state);
  if (!config) return null;

  const photoRows = await loadRegistrationPhotos(registration.id);
  const photos = await serializeRegistrationPhotos(photoRows);
  const resolved = await resolvePhotoUrl(registration);

  return serializeRegistration(
    resolved,
    config,
    asOf,
    householdRole,
    photos,
  );
}
