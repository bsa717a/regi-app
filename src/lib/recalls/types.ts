export type RecallStatus = "open" | "completed" | "not_applicable";

export type RecallEligibility =
  | { eligible: true; reason: null }
  | { eligible: false; reason: string };

export type NhtsaRecallRow = {
  nhtsaCampaignNumber: string;
  manufacturer: string | null;
  component: string | null;
  summary: string | null;
  consequence: string | null;
  remedy: string | null;
  notesFromNhtsa: string | null;
  reportReceivedDate: string | null;
  parkIt: boolean;
  parkOutside: boolean;
  overTheAirUpdate: boolean;
};

export type RegistrationRecallDto = {
  id: string;
  registrationId: string;
  nhtsaCampaignNumber: string;
  manufacturer: string | null;
  component: string | null;
  summary: string | null;
  consequence: string | null;
  remedy: string | null;
  notesFromNhtsa: string | null;
  reportReceivedDate: string | null;
  parkIt: boolean;
  parkOutside: boolean;
  overTheAirUpdate: boolean;
  status: RecallStatus;
  userNotes: string | null;
  completedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RecallsOverviewDto = {
  registrationId: string;
  vehicleName: string;
  vin: string | null;
  canEdit: boolean;
  eligibility: RecallEligibility;
  recallsCheckedAt: string | null;
  openCount: number;
  recalls: RegistrationRecallDto[];
};

export type PatchRecallInput = {
  status?: RecallStatus;
  userNotes?: string | null;
};
