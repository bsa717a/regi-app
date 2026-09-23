import type { RegistrationStatus } from "@/lib/stateEngine/status";

export function statusLabel(status: RegistrationStatus): string {
  if (status === "Due Soon") return "Due soon";
  return status;
}

/** Space Mono countdown on a garage card: "373 DAYS" / "63 DAYS AGO". */
export function daysCountLabel(days: number): string {
  if (days > 1) return `${days} DAYS`;
  if (days === 1) return "1 DAY";
  if (days === 0) return "TODAY";
  if (days === -1) return "1 DAY AGO";
  return `${Math.abs(days)} DAYS AGO`;
}

export function vehicleDisplayName(vehicle: {
  nickname?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
}): string {
  const nick = vehicle.nickname?.trim();
  if (nick) return nick;
  const parts = [vehicle.year, vehicle.make, vehicle.model].filter(
    (part) => part !== null && part !== undefined && String(part).trim() !== "",
  );
  if (parts.length > 0) return parts.join(" ");
  return "Vehicle";
}

export function registrationCountLabel(count: number): string {
  const noun = count === 1 ? "REGISTRATION" : "REGISTRATIONS";
  return `${count} ${noun} · SOONEST FIRST`;
}

export type ComplianceBanner = {
  tone: "current" | "due" | "expired";
  title: string;
  detail: string;
};

type BannerVehicle = {
  nickname?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  status: RegistrationStatus;
  daysUntilExpiration: number;
};

function bySoonest(a: BannerVehicle, b: BannerVehicle): number {
  return a.daysUntilExpiration - b.daysUntilExpiration;
}

export function garageComplianceBanner(
  vehicles: BannerVehicle[],
): ComplianceBanner | null {
  if (vehicles.length === 0) return null;

  const expired = vehicles
    .filter((vehicle) => vehicle.status === "Expired")
    .sort(bySoonest);
  if (expired.length > 0) {
    const focus = expired[0]!;
    const name = vehicleDisplayName(focus);
    const days = Math.abs(focus.daysUntilExpiration);
    const dayWord = days === 1 ? "day" : "days";
    return {
      tone: "expired",
      title:
        expired.length === 1
          ? "1 vehicle out of compliance"
          : `${expired.length} vehicles out of compliance`,
      detail: `${name} expired ${days} ${dayWord} ago`,
    };
  }

  const due = vehicles
    .filter((vehicle) => vehicle.status === "Due Soon")
    .sort(bySoonest);
  if (due.length > 0) {
    const focus = due[0]!;
    const name = vehicleDisplayName(focus);
    const days = focus.daysUntilExpiration;
    const when =
      days <= 0
        ? "expires today"
        : `expires in ${days} ${days === 1 ? "day" : "days"}`;
    return {
      tone: "due",
      title:
        due.length === 1
          ? "1 renewal due soon"
          : `${due.length} renewals due soon`,
      detail: `${name} ${when}`,
    };
  }

  const soonest = [...vehicles].sort(bySoonest)[0]!;
  const days = soonest.daysUntilExpiration;
  const detail =
    days <= 0
      ? "Next renewal is today. Nothing needed from you."
      : `Next renewal in ${days} ${days === 1 ? "day" : "days"}. Nothing needed from you.`;
  return {
    tone: "current",
    title: "Everything is current",
    detail,
  };
}

export function renewalHeroCopy(vehicle: {
  nickname?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  daysUntilExpiration: number;
  status: RegistrationStatus;
}): { count: string; sentence: string } {
  const name = vehicleDisplayName(vehicle);
  const days = vehicle.daysUntilExpiration;
  if (vehicle.status === "Expired" || days < 0) {
    const n = Math.abs(days);
    return {
      count: String(n),
      sentence: `${n === 1 ? "day" : "days"} since ${name} went out of compliance`,
    };
  }
  if (days === 0) {
    return { count: "0", sentence: `days until ${name} expires` };
  }
  return {
    count: String(days),
    sentence: `${days === 1 ? "day" : "days"} until ${name} expires`,
  };
}
