import type { Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { vehicleDisplayName } from "./access";
import { buildOverview } from "./serialize";
import type { MaintenanceOverviewDto } from "./types";

export async function loadMaintenanceOverview(
  registration: Registration,
  canEdit: boolean,
): Promise<MaintenanceOverviewDto> {
  const [tasks, logs, latestUsage] = await Promise.all([
    prisma.maintenanceTask.findMany({
      where: { registrationId: registration.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.maintenanceLog.findMany({
      where: { registrationId: registration.id },
      include: { task: { select: { name: true } } },
      orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.usageReading.findFirst({
      where: { registrationId: registration.id },
      orderBy: [{ readingOn: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return buildOverview({
    registrationId: registration.id,
    registrationType: registration.type,
    vehicleName: vehicleDisplayName(registration),
    canEdit,
    tasks,
    logs,
    latestUsage,
  });
}
