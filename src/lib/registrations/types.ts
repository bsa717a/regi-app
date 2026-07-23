import type { MemberRole, RegistrationType } from "@prisma/client";
import type { RegistrationStatus } from "@/lib/stateEngine/status";

/** Type-specific identity / attributes stored in Registration.details. */
export type RegistrationDetails = {
  hin?: string | null;
  serial?: string | null;
  ohvClass?: string | null;
  motorhomeClass?: string | null;
  unladenWeightLbs?: number | null;
  lengthFeet?: number | null;
  horsepower?: number | null;
  [key: string]: unknown;
};

export type RegistrationPhotoDto = {
  id: string;
  url: string;
  isCover: boolean;
  sortOrder: number;
};

export type RegistrationDto = {
  id: string;
  householdId: string;
  /** Caller's accepted role in this registration's household. */
  householdRole: MemberRole;
  /** True when the caller may mutate this registration (owner only). */
  canEdit: boolean;
  type: RegistrationType;
  vin: string | null;
  plate: string | null;
  state: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  /** Signed URL for the cover garage photo (garage card hero). */
  photoUrl: string | null;
  photos: RegistrationPhotoDto[];
  bodyClass: string | null;
  details: RegistrationDetails;
  registrationExpiresOn: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: RegistrationStatus;
  daysUntilExpiration: number;
  countdown: string;
};

export type CreateRegistrationInput = {
  type: RegistrationType;
  vin?: string | null;
  plate?: string | null;
  state: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  nickname?: string | null;
  photoUrl?: string | null;
  bodyClass?: string | null;
  details?: RegistrationDetails;
  registrationExpiresOn: string;
};

export type PatchRegistrationInput = Partial<
  Omit<CreateRegistrationInput, "state" | "type"> & { state?: string }
>;
