import type { MemberRole, Vehicle } from "@prisma/client";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import { computeRegistrationStatus } from "@/lib/stateEngine/status";
import { roleCanEdit } from "@/lib/household/roles";
import type { VehicleDto } from "@/lib/vehicles/types";

export function serializeVehicle(
  vehicle: Vehicle,
  config: StateRulesConfig,
  asOf: Date = new Date(),
  householdRole: MemberRole = "owner",
): VehicleDto {
  const status = computeRegistrationStatus(
    vehicle.registrationExpiresOn,
    config,
    asOf,
  );

  return {
    id: vehicle.id,
    householdId: vehicle.householdId,
    householdRole,
    canEdit: roleCanEdit(householdRole),
    vin: vehicle.vin,
    plate: vehicle.plate,
    state: vehicle.state,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    nickname: vehicle.nickname,
    photoUrl: vehicle.photoUrl,
    bodyClass: vehicle.bodyClass,
    registrationExpiresOn: vehicle.registrationExpiresOn
      .toISOString()
      .slice(0, 10),
    createdBy: vehicle.createdBy,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
    status: status.status,
    daysUntilExpiration: status.daysUntilExpiration,
    countdown: status.countdown,
  };
}
