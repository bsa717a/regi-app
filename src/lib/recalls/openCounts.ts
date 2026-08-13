import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isActiveOpenRecall } from "./activeRecall";
import { getRecallEligibility } from "./eligibility";

type RegistrationRecallCountInput = Pick<
  Registration,
  "id" | "type" | "year" | "make" | "model" | "recallsCheckedAt"
>;

/**
 * Count open recalls still present in the latest NHTSA sync for each registration.
 * Used for garage card badges without loading full overviews.
 */
export async function countOpenRecallsByRegistration(
  registrations: RegistrationRecallCountInput[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const registration of registrations) counts.set(registration.id, 0);
  if (registrations.length === 0) return counts;

  const recallDelegate = (
    prisma as unknown as {
      registrationRecall?: { findMany: typeof prisma.registration.findMany };
    }
  ).registrationRecall;
  if (!recallDelegate) return counts;

  const eligible = registrations.filter(
    (registration) => getRecallEligibility(registration).eligible,
  );
  const eligibleIds = eligible.map((registration) => registration.id);
  if (eligibleIds.length === 0) return counts;

  const checkedAtById = new Map(
    eligible.map((registration) => [
      registration.id,
      registration.recallsCheckedAt,
    ]),
  );

  try {
    const rows = await prisma.registrationRecall.findMany({
      where: {
        registrationId: { in: eligibleIds },
        status: "open",
      },
      select: {
        registrationId: true,
        status: true,
        lastSeenAt: true,
      },
    });

    for (const row of rows) {
      const checkedAt = checkedAtById.get(row.registrationId);
      if (!isActiveOpenRecall(row, checkedAt)) continue;
      counts.set(row.registrationId, (counts.get(row.registrationId) ?? 0) + 1);
    }
  } catch {
    return counts;
  }

  return counts;
}
