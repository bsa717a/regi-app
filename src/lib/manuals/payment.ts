import { randomUUID } from "node:crypto";
import { MANUAL_PAID_LOOKUP_FEE_CENTS } from "@/lib/manuals/constants";

export type ManualLookupChargeResult = {
  ok: true;
  stripePaymentIntentId: string;
  amountCents: number;
};

/**
 * Mock Stripe charge for owner-manual lookup.
 * Replace with real Stripe PaymentIntent creation when billing ships.
 */
export async function chargeManualLookup(): Promise<ManualLookupChargeResult> {
  return {
    ok: true,
    stripePaymentIntentId: `pi_mock_manual_${randomUUID()}`,
    amountCents: MANUAL_PAID_LOOKUP_FEE_CENTS,
  };
}
