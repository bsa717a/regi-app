import type { MemberRole } from "@prisma/client";
import type { RegistrationStatus } from "@/lib/stateEngine/status";

export type VehicleDto = {
  id: string;
  householdId: string;
  /** Caller's accepted role in this vehicle's household. */
  householdRole: MemberRole;
  /** True when the caller may mutate this vehicle (owner only). */
  canEdit: boolean;
  vin: string | null;
  plate: string | null;
  state: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  photoUrl: string | null;
  bodyClass: string | null;
  registrationExpiresOn: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  countdown: string;
};

export type CreateVehicleInput = {
  vin?: string | null;
  plate?: string | null;
  state: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  nickname?: string | null;
  photoUrl?: string | null;
  bodyClass?: string | null;
  registrationExpiresOn: string;
};

export type PatchVehicleInput = Partial<
  Omit<CreateVehicleInput, "state"> & { state?: string }
>;
