import type { MemberRole, Prisma, Registration } from "@prisma/client";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { computeRegistrationStatus } from "@/lib/stateEngine/status";
import { roleCanEdit } from "@/lib/household/roles";
import type {
  RegistrationDetails,
  RegistrationDto,
  RegistrationPhotoDto,
} from "@/lib/registrations/types";

function asDetails(value: Prisma.JsonValue): RegistrationDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as RegistrationDetails;
}

export function serializeRegistration(
  registration: Registration,
  config: StateRulesConfig,
  asOf: Date = new Date(),
  householdRole: MemberRole = "owner",
  photos: RegistrationPhotoDto[] = [],
): RegistrationDto {
  const status = computeRegistrationStatus(
    registration.registrationExpiresOn,
    config,
    asOf,
  );

  const coverUrl =
    photos.find((photo) => photo.isCover)?.url ??
    photos[0]?.url ??
    registration.photoUrl;

  return {
    id: registration.id,
    householdId: registration.householdId,
    householdRole,
    canEdit: roleCanEdit(householdRole),
    type: registration.type,
    vin: registration.vin,
    plate: registration.plate,
    state: registration.state,
    make: registration.make,
    model: registration.model,
    year: registration.year,
    nickname: registration.nickname,
    photoUrl: coverUrl ?? null,
    photos,
    bodyClass: registration.bodyClass,
    details: asDetails(registration.details),
    registrationExpiresOn: registration.registrationExpiresOn
      .toISOString()
      .slice(0, 10),
    createdBy: registration.createdBy,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
    status: status.status,
    daysUntilExpiration: status.daysUntilExpiration,
    countdown: status.countdown,
  };
}
