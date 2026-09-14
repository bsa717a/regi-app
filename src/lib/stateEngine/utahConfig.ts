import type { StateRulesConfig } from "@/lib/stateEngine/types";

const UTAH_ROAD_DOCUMENTS: StateRulesConfig["requiredDocuments"] = [
  {
    type: "registration",
    label: "Current registration card",
    required: true,
    notes: "Front and back of your Utah registration card.",
    applicability: { kind: "always" },
  },
  {
    type: "insurance",
    label: "Proof of insurance",
    required: true,
    notes: "Insurance card or declarations page showing active coverage.",
    applicability: { kind: "always" },
  },
  {
    type: "emissions",
    label: "Emissions certificate",
    required: true,
    notes:
      "Required in participating Utah counties (Salt Lake, Davis, Utah, Weber, Cache, and parts of Box Elder). Exempt vehicles (newer models, certain body classes) may skip — staff will confirm.",
    applicability: {
      kind: "county_list",
      counties: [
        "Salt Lake",
        "Davis",
        "Utah",
        "Weber",
        "Cache",
        "Box Elder",
      ],
      note: "County-level applicability; verify against registration county.",
    },
  },
];

const UTAH_NON_EMISSIONS_DOCUMENTS: StateRulesConfig["requiredDocuments"] = [
  {
    type: "registration",
    label: "Current registration / decal",
    required: true,
    notes: "Current Utah registration card or decal paperwork.",
    applicability: { kind: "always" },
  },
  {
    type: "insurance",
    label: "Proof of insurance",
    required: true,
    notes: "Insurance card or declarations page showing active coverage when required.",
    applicability: { kind: "always" },
  },
];

/** Utah State Engine config — single source of truth for UT rules. */
export const UTAH_STATE_RULES_CONFIG: StateRulesConfig = {
  displayName: "Utah",
  requiredDocuments: UTAH_ROAD_DOCUMENTS,
  renewalWindow: {
    daysBeforeExpirationOpen: 90,
    lateFeeStartsAfterDays: 0,
    expirationConvention:
      "Utah registrations typically expire on the last day of the month shown on the registration card.",
    dueSoonThresholdDays: 60,
  },
  fees: {
    currency: "USD",
    registrationFeeCents: 4400,
    lateFeeCents: 1000,
    regiServiceFeeCents: 2500,
    notes:
      "Registration fee is an estimate; actual DMV fee may vary by weight/type. Late fee applies after expiration.",
  },
  reminderSchedule: {
    daysBeforeExpiration: [90, 60, 30, 14, 7, 3, 0],
    postExpiration: {
      intervalDays: 3,
      maxReminders: 10,
    },
  },
  conciergeWorkflow: [
    {
      status: "Requested",
      label: "Requested",
      order: 0,
      description: "Renewal started; waiting for documents.",
    },
    {
      status: "DocumentsReceived",
      label: "Documents Received",
      order: 1,
      description: "All required documents uploaded.",
    },
    {
      status: "Reviewing",
      label: "Reviewing",
      order: 2,
      description: "REGI staff is reviewing your documents.",
    },
    {
      status: "Processing",
      label: "Processing",
      order: 3,
      description: "Staff is preparing your renewal submission.",
    },
    {
      status: "Submitted",
      label: "Submitted",
      order: 4,
      description: "Submitted to the state / DMV.",
    },
    {
      status: "Completed",
      label: "Completed",
      order: 5,
      description: "Renewal approved and completed.",
    },
    {
      status: "StickerMailed",
      label: "Sticker Mailed",
      order: 6,
      description: "Registration sticker is on its way.",
    },
  ],
  registrationTypes: [
    {
      type: "passenger",
      label: "Passenger vehicle",
      pluralLabel: "Passenger vehicles",
      identityFields: ["vin", "plate", "yearMakeModel"],
      decode: "nhtsa_vin",
    },
    {
      type: "motorhome",
      label: "Motorhome",
      pluralLabel: "Motorhomes",
      identityFields: ["vin", "plate", "yearMakeModel"],
      decode: "nhtsa_vin",
    },
    {
      type: "motorcycle",
      label: "Motorcycle",
      pluralLabel: "Motorcycles",
      identityFields: ["vin", "plate", "yearMakeModel"],
      decode: "nhtsa_vin",
    },
    {
      type: "trailer",
      label: "Trailer",
      pluralLabel: "Trailers",
      identityFields: ["vin", "plate", "yearMakeModel"],
      decode: "none",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
    {
      type: "ohv",
      label: "OHV",
      pluralLabel: "OHVs",
      identityFields: ["vin", "plate", "serial", "yearMakeModel"],
      decode: "none",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
    {
      type: "snowmobile",
      label: "Snowmobile",
      pluralLabel: "Snowmobiles",
      identityFields: ["vin", "plate", "serial", "yearMakeModel"],
      decode: "none",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
    {
      type: "boat",
      label: "Boat",
      pluralLabel: "Boats",
      identityFields: ["hin", "plate", "yearMakeModel"],
      decode: "none",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
  ],
};
