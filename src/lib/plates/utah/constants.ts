/** Official Utah DMV personalized-plate information (no REGI prefill). */
export const UTAH_PERSONALIZED_PLATES_INFO_URL =
  "https://dmv.utah.gov/plates/personalized/";

/** Official catalog of standard and specialty plate designs. */
export const UTAH_PLATE_CATALOG_URL =
  "https://dmv.utah.gov/plates/license-plates/";

/** Utah Motor Vehicle Portal root — not the plate-order handoff. */
export const UTAH_MVP_URL = "https://mvp.tax.utah.gov/";

/**
 * Public Order Plates instructions (VIN last-4, payment method, reCAPTCHA).
 * No combo/design query params — do not invent deep-link prefill.
 */
export const UTAH_MVP_ORDER_PLATES_URL =
  "https://mvp.tax.utah.gov/?Link=OrderPlates";

/** Optional public status lookup after an order. */
export const UTAH_MVP_PLATE_STATUS_URL =
  "https://mvp.tax.utah.gov/?link=WhereIsYourPlate";

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
  "REGI does not send this to the DMV, prefill MVP, or skip payment. Copy the packet, then enter it yourself.";

export const UTAH_PACKET_STAYS_OPEN_NOTE =
  "Keep this packet available while you work in the other tab. REGI does not prefill MVP or skip payment.";

export const UTAH_GET_TO_PAYMENT_STEPS = [
  {
    id: "open-order-plates",
    title: "Open Order Plates",
    body: "Open the Order Plates link. It lands on license plate order instructions — last 4 VIN, payment method, and reCAPTCHA — not the MVP homepage.",
  },
  {
    id: "enter-vehicle",
    title: "Enter your vehicle",
    body: "Enter the vehicle using the last 4 characters of the VIN.",
  },
  {
    id: "recaptcha",
    title: "Complete reCAPTCHA",
    body: "Complete the reCAPTCHA on MVP before you continue.",
  },
  {
    id: "enter-choices",
    title: "Enter personalized choices from the packet",
    body: "Type the plate design, combinations, and meaning from your order packet. REGI does not prefill these fields.",
  },
  {
    id: "pay-on-mvp",
    title: "Complete payment on MVP",
    body: "Finish payment on Utah MVP. Paying does not mean your combination is approved, and REGI does not skip this step.",
  },
] as const;
