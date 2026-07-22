import { daysUntilExpiration } from "@/lib/stateEngine/status";
import type { StateRulesConfig } from "@/lib/stateEngine/types";
import type { FeeBreakdown } from "./types";

/**
 * Compute an informational fee estimate from state_rules.config.fees.
 * Late fee applies when the vehicle is past the state's lateFeeStartsAfterDays
 * grace period after expiration. No Stripe / charging.
 */
export function computeFeeBreakdown(
  config: StateRulesConfig,
  registrationExpiresOn: Date | string,
  options: {
    asOf?: Date;
    county?: string | null;
  } = {},
): FeeBreakdown {
  const asOf = options.asOf ?? new Date();
  const days = daysUntilExpiration(registrationExpiresOn, asOf);
  const grace = config.renewalWindow.lateFeeStartsAfterDays;
  // Past grace after expiration: grace 0 → any expired day; grace 5 → days < -5.
  const lateApplies = days < -grace;

  const registrationFeeCents = config.fees.registrationFeeCents;
  const regiServiceFeeCents = config.fees.regiServiceFeeCents;
  const lateFeeCents = lateApplies ? config.fees.lateFeeCents : 0;
  const totalCents =
    registrationFeeCents + regiServiceFeeCents + lateFeeCents;

  const notesParts = [
    "Estimate only — you will not be charged during MVP.",
    config.fees.notes,
  ].filter(Boolean);

  return {
    currency: "USD",
    registrationFeeCents,
    regiServiceFeeCents,
    lateFeeCents,
    totalCents,
    isEstimate: true,
    notes: notesParts.join(" "),
    county: options.county?.trim() || null,
  };
}

export function parseFeeBreakdown(value: unknown): FeeBreakdown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      currency: "USD",
      registrationFeeCents: 0,
      regiServiceFeeCents: 0,
      lateFeeCents: 0,
      totalCents: 0,
      isEstimate: true,
      county: null,
    };
  }

  const record = value as Record<string, unknown>;
  const n = (key: string) => {
    const v = record[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  };

  const registrationFeeCents = n("registrationFeeCents");
  const regiServiceFeeCents = n("regiServiceFeeCents");
  const lateFeeCents = n("lateFeeCents");
  const totalFromRow = n("totalCents");
  const totalCents =
    totalFromRow ||
    registrationFeeCents + regiServiceFeeCents + lateFeeCents;

  const county =
    typeof record.county === "string" && record.county.trim()
      ? record.county.trim()
      : null;

  return {
    currency: "USD",
    registrationFeeCents,
    regiServiceFeeCents,
    lateFeeCents,
    totalCents,
    isEstimate: true,
    notes: typeof record.notes === "string" ? record.notes : undefined,
    county,
  };
}
