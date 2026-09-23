import { formatUsdCents } from "@/lib/renewals/formatMoney";

export type DisplayFeeInput = {
  daysUntilExpiration: number;
  registrationFeeCents: number;
  regiServiceFeeCents: number;
  lateFeeCents: number;
  lateFeeStartsAfterDays: number;
};

export function displayedRenewalFee(input: DisplayFeeInput): {
  totalCents: number;
  lateFeeCents: number;
} {
  const lateApplies =
    input.daysUntilExpiration < -input.lateFeeStartsAfterDays;
  const lateFeeCents = lateApplies ? input.lateFeeCents : 0;
  return {
    totalCents:
      input.registrationFeeCents + input.regiServiceFeeCents + lateFeeCents,
    lateFeeCents,
  };
}

export function renewalFeeNote(lateFeeCents: number): string | null {
  if (lateFeeCents <= 0) return null;
  return `Includes the ${formatUsdCents(lateFeeCents)} late penalty. We pay it, you are billed once.`;
}
