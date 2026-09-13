import { titleCaseMakeModel } from "@/lib/registrations/illustrations";
import type { RenewalStatus } from "@prisma/client";

export function renewalStatusLabel(status: RenewalStatus): string {
  switch (status) {
    case "Requested":
      return "Requested";
    case "DocumentsReceived":
      return "Documents Received";
    case "Reviewing":
      return "Reviewing";
    case "Processing":
      return "Processing";
    case "Submitted":
      return "Submitted";
    case "Completed":
      return "Completed";
    case "StickerMailed":
      return "Sticker Mailed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function renewalVehicleLabel(registration: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  if (registration.nickname?.trim()) return registration.nickname.trim();
  const parts = [
    registration.year,
    titleCaseMakeModel(registration.make),
    titleCaseMakeModel(registration.model),
  ]
    .filter(Boolean)
    .join(" ");
  return parts || "Registration";
}
