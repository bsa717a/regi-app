import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRecallEligibility } from "./eligibility";
import { fetchRecallsByVehicle, type FetchRecallsOptions } from "./nhtsa";
import type { NhtsaRecallRow } from "./types";

export type SyncRecallsResult =
  | {
      ok: true;
      inserted: number;
      updated: number;
      total: number;
    }
  | { ok: false; error: string; ineligible?: boolean };

function nhtsaDataFields(recall: NhtsaRecallRow, lastSeenAt: Date) {
  return {
    manufacturer: recall.manufacturer,
    component: recall.component,
    summary: recall.summary,
    consequence: recall.consequence,
    remedy: recall.remedy,
    notesFromNhtsa: recall.notesFromNhtsa,
    reportReceivedDate: recall.reportReceivedDate,
    parkIt: recall.parkIt,
    parkOutside: recall.parkOutside,
    overTheAirUpdate: recall.overTheAirUpdate,
    lastSeenAt,
  };
}

/**
 * Upsert NHTSA recall rows for a registration.
 * Preserves user status, notes, and completedAt on existing rows.
 */
export async function syncRecallsForRegistration(
  registration: Registration,
  recalls: NhtsaRecallRow[],
  checkedAt: Date = new Date(),
): Promise<{ inserted: number; updated: number; total: number }> {
  let inserted = 0;
  let updated = 0;

  for (const recall of recalls) {
    const existing = await prisma.registrationRecall.findUnique({
      where: {
        registrationId_nhtsaCampaignNumber: {
          registrationId: registration.id,
          nhtsaCampaignNumber: recall.nhtsaCampaignNumber,
        },
      },
    });

    const data = nhtsaDataFields(recall, checkedAt);

    if (existing) {
      await prisma.registrationRecall.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
    } else {
      await prisma.registrationRecall.create({
        data: {
          registrationId: registration.id,
          nhtsaCampaignNumber: recall.nhtsaCampaignNumber,
          ...data,
          status: "open",
        },
      });
      inserted += 1;
    }
  }

  await prisma.registration.update({
    where: { id: registration.id },
    data: { recallsCheckedAt: checkedAt },
  });

  return { inserted, updated, total: recalls.length };
}

export async function refreshRecallsForRegistration(
  registration: Registration,
  options: FetchRecallsOptions = {},
): Promise<SyncRecallsResult> {
  const eligibility = getRecallEligibility(registration);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason, ineligible: true };
  }

  const result = await fetchRecallsByVehicle(
    registration.year!,
    registration.make!,
    registration.model!,
    options,
  );

  if (!result.ok) {
    return result;
  }

  const sync = await syncRecallsForRegistration(registration, result.recalls);
  return { ok: true, ...sync };
}
