/**
 * State Engine — config types only.
 *
 * All state-specific values live in `state_rules.config` (jsonb).
 * Enabling a second state = inserting a `state_rules` row with this shape.
 * Application code must read from StateRulesConfig; never hard-code UT/CA/etc.
 */

/** Document types required for a state's renewal (mirrors Prisma DocumentType). */
export type StateDocumentType =
  | "registration"
  | "insurance"
  | "title"
  | "emissions"
  | "temp_permit";

/** Concierge workflow statuses (mirrors Prisma RenewalStatus). */
export type ConciergeStatus =
  | "Requested"
  | "DocumentsReceived"
  | "Reviewing"
  | "Processing"
  | "Submitted"
  | "Completed"
  | "StickerMailed";

/**
 * When a required document applies.
 * - always: every renewal needs it
 * - county_list: only vehicles registered in listed counties
 * - county_exclude: needed unless county is in the exclude list
 */
export type DocumentApplicability =
  | { kind: "always" }
  | {
      kind: "county_list";
      counties: string[];
      note?: string;
    }
  | {
      kind: "county_exclude";
      counties: string[];
      note?: string;
    };

export type RequiredDocumentRule = {
  type: StateDocumentType;
  /** Human-facing label for upload UI */
  label: string;
  required: boolean;
  /** Extra guidance shown next to the upload slot */
  notes?: string;
  applicability: DocumentApplicability;
};

export type RenewalWindowRules = {
  /**
   * How many days before expiration the renewal window opens
   * (user may start concierge). Null = anytime.
   */
  daysBeforeExpirationOpen: number | null;
  /** Days after expiration before late fees apply (if applicable). */
  lateFeeStartsAfterDays: number;
  /**
   * How expiration dates are interpreted for this state
   * (e.g. end-of-month of the registration month).
   */
  expirationConvention: string;
  /** Threshold (days) for "Due Soon" status badge. */
  dueSoonThresholdDays: number;
};

/** Fee amounts in the smallest currency unit (cents for USD). */
export type FeeStructure = {
  currency: "USD";
  /** Estimated / typical registration fee (actual amount may vary). */
  registrationFeeCents: number;
  lateFeeCents: number;
  regiServiceFeeCents: number;
  notes?: string;
};

export type ReminderSchedule = {
  /**
   * Offsets in days before expiration when reminders fire.
   * Default: [90, 60, 30, 14, 7, 3, 0]
   */
  daysBeforeExpiration: number[];
  /**
   * After expiration: send escalated reminders on this cadence.
   */
  postExpiration: {
    /** Days between escalated reminders (e.g. every 3 days). */
    intervalDays: number;
    /** Optional cap on post-expiration reminders. */
    maxReminders?: number;
  };
};

export type ConciergeWorkflowStep = {
  status: ConciergeStatus;
  label: string;
  /** Display order in the progress tracker (ascending). */
  order: number;
  description?: string;
};

/**
 * Single source of truth for one U.S. state's registration rules.
 * Stored as `state_rules.config` jsonb.
 */
export type StateRulesConfig = {
  /** Display name, e.g. "Utah" */
  displayName: string;
  requiredDocuments: RequiredDocumentRule[];
  renewalWindow: RenewalWindowRules;
  fees: FeeStructure;
  reminderSchedule: ReminderSchedule;
  conciergeWorkflow: ConciergeWorkflowStep[];
};
