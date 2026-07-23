import { prisma } from "@/lib/prisma";
import {
  daysUntilExpiration,
  formatExpirationCountdown,
} from "@/lib/stateEngine/status";
import { getHouseholdRoleMap } from "@/lib/registrations/household";
import type { RegiGarageContext, RegiGarageVehicleContext } from "@/lib/regi/types";

function vehicleLabel(input: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  type: string;
}): string {
  if (input.nickname?.trim()) return input.nickname.trim();
  const parts = [input.year, input.make, input.model].filter(Boolean).join(" ");
  if (parts) return parts;
  if (input.plate?.trim()) return input.plate.trim();
  return input.type.replace("_", " ");
}

function firstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

export async function loadRegiGarageContext(
  userId: string,
  userName: string | null,
): Promise<RegiGarageContext> {
  const roleMap = await getHouseholdRoleMap(userId);
  const householdIds = [...roleMap.keys()];

  if (householdIds.length === 0) {
    return {
      userFirstName: firstName(userName),
      vehicleCount: 0,
      documentCount: 0,
      soonestExpiration: null,
      vehicles: [],
    };
  }

  const registrations = await prisma.registration.findMany({
    where: { householdId: { in: householdIds } },
    orderBy: [{ registrationExpiresOn: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { documents: true } },
    },
  });

  const vehicles: RegiGarageVehicleContext[] = registrations.map((registration) => {
    const days = daysUntilExpiration(registration.registrationExpiresOn);
    return {
      id: registration.id,
      label: vehicleLabel(registration),
      type: registration.type,
      state: registration.state,
      plate: registration.plate,
      status: days < 0 ? "Expired" : days <= 30 ? "Expiring soon" : "Current",
      daysUntilExpiration: days,
      expiresOn: registration.registrationExpiresOn.toISOString().slice(0, 10),
      documentCount: registration._count.documents,
    };
  });

  const documentCount = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.documentCount,
    0,
  );

  return {
    userFirstName: firstName(userName),
    vehicleCount: vehicles.length,
    documentCount,
    soonestExpiration: vehicles[0] ?? null,
    vehicles,
  };
}

export function formatGarageContextForPrompt(context: RegiGarageContext): string {
  if (context.vehicleCount === 0) {
    return "The user's garage is empty — no registrations yet.";
  }

  const lines = context.vehicles.map((vehicle) => {
    const countdown = formatExpirationCountdown(vehicle.expiresOn);
    return `- ${vehicle.label} (${vehicle.type}, ${vehicle.state}): ${vehicle.status}, expires ${vehicle.expiresOn} (${countdown}, ${vehicle.daysUntilExpiration} days), ${vehicle.documentCount} document(s)`;
  });

  return [
    `Garage summary: ${context.vehicleCount} registration(s), ${context.documentCount} document(s) total.`,
    "Vehicles:",
    ...lines,
  ].join("\n");
}

export function buildQuickActions(context: RegiGarageContext): string[] {
  const actions = ["App features"];
  if (context.vehicleCount > 0) {
    actions.unshift("What's expiring?");
  }
  return actions;
}
