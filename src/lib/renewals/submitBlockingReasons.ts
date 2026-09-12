export type SubmitBlockingReason = {
  key: "email" | "docs" | "county";
  message: string;
};

export type SubmitBlockingInput = {
  emailVerified: boolean;
  documentsComplete: boolean;
  needsCounty: boolean;
  countySelected: boolean;
  missingDocumentLabels: string[];
};

/** Reasons Submit renewal stays disabled, in display order. */
export function getSubmitBlockingReasons(
  input: SubmitBlockingInput,
): SubmitBlockingReason[] {
  const reasons: SubmitBlockingReason[] = [];

  if (!input.emailVerified) {
    reasons.push({
      key: "email",
      message: "Verify your email first",
    });
  }

  if (!input.documentsComplete) {
    if (input.missingDocumentLabels.length === 1) {
      reasons.push({
        key: "docs",
        message: `Missing ${input.missingDocumentLabels[0]}`,
      });
    } else if (input.missingDocumentLabels.length > 1) {
      reasons.push({
        key: "docs",
        message: `Missing documents: ${input.missingDocumentLabels.join(", ")}`,
      });
    } else {
      reasons.push({
        key: "docs",
        message: "Upload required documents",
      });
    }
  }

  if (input.needsCounty && !input.countySelected) {
    reasons.push({
      key: "county",
      message: "Select a registration county",
    });
  }

  return reasons;
}

export function isSubmitRenewalBlocked(input: SubmitBlockingInput): boolean {
  return getSubmitBlockingReasons(input).length > 0;
}

/** Native tooltip / title for a disabled Submit button. */
export function submitDisabledTitle(
  reasons: SubmitBlockingReason[],
): string | undefined {
  if (reasons.length === 0) return undefined;
  return `Submit is disabled: ${reasons.map((reason) => reason.message).join("; ")}`;
}
