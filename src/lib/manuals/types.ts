import type { OwnerManualSource } from "@prisma/client";

export type ManualLookupResult =
  | {
      ok: true;
      url: string;
      source: OwnerManualSource;
      cached?: boolean;
    }
  | {
      ok: false;
      error?: string;
      paidAvailable?: boolean;
      feeCents?: number;
    };

export type ManualPurchaseResult =
  | {
      ok: true;
      url: string;
      charged: true;
      pending?: false;
    }
  | {
      ok: false;
      charged: true;
      pending: true;
      message: string;
    }
  | {
      ok: false;
      charged: false;
      error: string;
    };
