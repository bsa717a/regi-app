import type { InviteStatus, MemberRole } from "@prisma/client";

export type HouseholdMemberDto = {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: MemberRole;
  inviteStatus: InviteStatus;
  isCurrentUser: boolean;
};

export type HouseholdDto = {
  id: string;
  name: string;
  ownerUserId: string;
  /** Role of the requesting user in this household. */
  myRole: MemberRole;
  members: HouseholdMemberDto[];
};

export type HouseholdsResponse = {
  households: HouseholdDto[];
};

export type InviteHouseholdRequest = {
  email: string;
  /** Optional; defaults to the caller's primary (owned) household. */
  householdId?: string;
};

export type InviteHouseholdResponse = {
  member: HouseholdMemberDto;
  /** Present in non-production for easier local testing. */
  inviteToken?: string;
  inviteUrl?: string;
};

export type AcceptHouseholdRequest = {
  token: string;
};

export type AcceptHouseholdResponse = {
  household: HouseholdDto;
};
