/** Official Utah DMV personalized-plate information (no REGI prefill). */
export const UTAH_PERSONALIZED_PLATES_INFO_URL =
  "https://dmv.utah.gov/plates/personalized/";

/** Official catalog of standard and specialty plate designs. */
export const UTAH_PLATE_CATALOG_URL =
  "https://dmv.utah.gov/plates/license-plates/";

/** Utah Motor Vehicle Portal — customer enters the request themselves. */
export const UTAH_MVP_URL = "https://mvp.tax.utah.gov/";

/** Utah Code §41-1a-1211 amounts — treat as estimates; DMV is final. */
export const UTAH_PLATE_APPLICATION_FEE_CENTS = 5000;
export const UTAH_PLATE_PROCESSING_FEE_CENTS = 2500;
export const UTAH_PLATE_RENEWAL_FEE_CENTS = 1000;

export const UTAH_PLATE_FEE_DISCLAIMER =
  "These amounts are estimates only. Utah DMV sets the final fees, including any special-group contribution. Paying does not mean your combination is approved.";

export const UTAH_PLATE_REQUIREMENTS = [
  {
    id: "currently-registered",
    title: "Currently Utah-registered vehicle",
    body: "The vehicle must already be registered in Utah. Personalized plates are not available for out-of-state or unregistered vehicles.",
  },
  {
    id: "letters-numbers",
    title: "Letters and numbers only",
    body: "Utah allows letters and numbers only. Punctuation and special characters (periods, apostrophes, dashes, and similar) are not allowed.",
  },
  {
    id: "payment-not-approval",
    title: "Payment is not approval",
    body: "Paying the application fee does not mean the DMV will approve your combination. Availability and content review happen after you submit.",
  },
  {
    id: "mail-only",
    title: "Mailed in about 8 weeks",
    body: "Approved plates are mailed only. Expect about eight weeks from order to delivery — there is no same-day pickup.",
  },
] as const;

export const UTAH_NO_PREFILL_NOTE =
  "REGI does not send this to the DMV or prefill MVP. Copy the summary, then enter it yourself.";
