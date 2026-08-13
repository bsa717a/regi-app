import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRecallsOverview } from "./serialize";
import type { RecallsOverviewDto } from "./types";

export async function loadRecallsOverview(
  registration: Registration,
  canEdit: boolean,
): Promise<RecallsOverviewDto> {
  const recalls = await prisma.registrationRecall.findMany({
    where: { registrationId: registration.id },
    orderBy: [{ status: "asc" }, { reportReceivedDate: "desc" }],
  });

  return buildRecallsOverview({
    registration,
    canEdit,
    recalls,
  });
}
