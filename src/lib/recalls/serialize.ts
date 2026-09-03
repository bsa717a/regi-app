import type { RegistrationRecall, Registration } from "@prisma/client";
import { vehicleDisplayName } from "@/lib/maintenance/access";
import { isActiveOpenRecall } from "./activeRecall";
import { getRecallEligibility } from "./eligibility";
import type {
  RecallsOverviewDto,
  RegistrationRecallDto,
  RecallStatus,
} from "./types";

function statusSortRank(status: RecallStatus): number {
  switch (status) {
    case "open":
      return 0;
    case "completed":
      return 1;
    case "not_applicable":
      return 2;
    default:
      return 3;
  }
}

function parseReportDate(value: string | null): number {
  if (!value) return 0;
  const parts = value.split("/");
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts.map((part) => Number.parseInt(part, 10));
  if (!day || !month || !year) return 0;
  return Date.UTC(year, month - 1, day);
}

export function serializeRecall(row: RegistrationRecall): RegistrationRecallDto {
  return {
    id: row.id,
    registrationId: row.registrationId,
    nhtsaCampaignNumber: row.nhtsaCampaignNumber,
    manufacturer: row.manufacturer,
    component: row.component,
    summary: row.summary,
    consequence: row.consequence,
    remedy: row.remedy,
    notesFromNhtsa: row.notesFromNhtsa,
    reportReceivedDate: row.reportReceivedDate,
    parkIt: row.parkIt,
    parkOutside: row.parkOutside,
    overTheAirUpdate: row.overTheAirUpdate,
    status: row.status as RecallStatus,
    userNotes: row.userNotes,
    completedAt: row.completedAt?.toISOString() ?? null,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function sortRecalls(recalls: RegistrationRecallDto[]): RegistrationRecallDto[] {
  return [...recalls].sort((a, b) => {
    const statusDiff = statusSortRank(a.status) - statusSortRank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return parseReportDate(b.reportReceivedDate) - parseReportDate(a.reportReceivedDate);
  });
}

export function buildRecallsOverview(input: {
  registration: Registration;
  canEdit: boolean;
  recalls: RegistrationRecall[];
}): RecallsOverviewDto {
  const serialized = sortRecalls(input.recalls.map(serializeRecall));
  const openCount = input.recalls.filter((recall) =>
    isActiveOpenRecall(recall, input.registration.recallsCheckedAt),
  ).length;

  return {
    registrationId: input.registration.id,
    vehicleName: vehicleDisplayName(input.registration),
    vin: input.registration.vin,
    canEdit: input.canEdit,
    eligibility: getRecallEligibility(input.registration),
    recallsCheckedAt: input.registration.recallsCheckedAt?.toISOString() ?? null,
    openCount,
    recalls: serialized,
  };
}
