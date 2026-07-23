/**
 * Idempotent seed for REGI local/dev.
 * Run: npx prisma db seed
 */
import { PrismaClient, RenewalStatus, StaffRole } from "@prisma/client";
import type { StateRulesConfig } from "../src/lib/stateEngine/types";

const prisma = new PrismaClient();

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
      notes: "Utah trailer fees may vary by unladen weight.",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
    {
      type: "ohv",
      label: "OHV",
      pluralLabel: "OHVs",
      identityFields: ["vin", "plate", "serial", "yearMakeModel"],
      decode: "none",
      notes: "Off-highway vehicles use OHV stickers / plates per Utah rules.",
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
      notes: "Use Hull Identification Number (HIN) when available.",
      requiredDocuments: UTAH_NON_EMISSIONS_DOCUMENTS,
    },
  ],
};

const DEMO_FIREBASE_UID = "demo-firebase-uid-regi-seed";
const DEMO_USER_EMAIL = "demo@regi.app";
const DEMO_HOUSEHOLD_NAME = "Demo Household";

/** Second demo user — viewer in the demo household (household sharing). */
const DEMO_VIEWER_FIREBASE_UID = "demo-viewer-firebase-uid-regi-seed";
const DEMO_VIEWER_EMAIL = "viewer@regi.app";

/** Staff allowlist seeds — idempotent upserts by firebase_uid. */
const STAFF_SEEDS = [
  {
    firebaseUid: DEMO_FIREBASE_UID,
    name: "Alex Demo (Staff)",
    role: StaffRole.admin,
  },
  {
    // Dedicated staff-only uid for portal testing (not a consumer user).
    firebaseUid: "staff-firebase-uid-regi-seed",
    name: "Riley Staff",
    role: StaffRole.agent,
  },
] as const;

function daysFromToday(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  // 1) Utah state rules
  await prisma.stateRule.upsert({
    where: { stateCode: "UT" },
    create: {
      stateCode: "UT",
      active: true,
      config: UTAH_STATE_RULES_CONFIG,
    },
    update: {
      active: true,
      config: UTAH_STATE_RULES_CONFIG,
    },
  });

  // 2) Demo user
  const user = await prisma.user.upsert({
    where: { firebaseUid: DEMO_FIREBASE_UID },
    create: {
      firebaseUid: DEMO_FIREBASE_UID,
      email: DEMO_USER_EMAIL,
      name: "Alex Demo",
      phone: "+18015550100",
      notificationPrefs: {
        push: true,
        email: true,
        sms: false,
      },
    },
    update: {
      email: DEMO_USER_EMAIL,
      name: "Alex Demo",
      phone: "+18015550100",
      notificationPrefs: {
        push: true,
        email: true,
        sms: false,
      },
    },
  });

  // 3) Household of one
  let household = await prisma.household.findFirst({
    where: { ownerUserId: user.id, name: DEMO_HOUSEHOLD_NAME },
  });

  if (!household) {
    household = await prisma.household.create({
      data: {
        name: DEMO_HOUSEHOLD_NAME,
        ownerUserId: user.id,
      },
    });
  }

  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId: user.id,
      },
    },
    create: {
      householdId: household.id,
      userId: user.id,
      role: "owner",
      inviteStatus: "accepted",
    },
    update: {
      role: "owner",
      inviteStatus: "accepted",
    },
  });

  // 4) Three demo passenger registrations (Current / Due Soon / Expired)
  const registrationSpecs = [
    {
      vin: "1GNSKCKC8MR312456",
      plate: "REGI01",
      make: "Chevrolet",
      model: "Tahoe",
      year: 2021,
      nickname: "Mom's Tahoe",
      bodyClass: "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)",
      registrationExpiresOn: daysFromToday(278),
      seedKey: "current",
    },
    {
      vin: "5YJ3E1EA5KF123789",
      plate: "REGI02",
      make: "Tesla",
      model: "Model 3",
      year: 2019,
      nickname: "Commuter",
      bodyClass: "Sedan/Saloon",
      registrationExpiresOn: daysFromToday(43),
      seedKey: "due_soon",
    },
    {
      vin: "1FTFW1E50MFA98765",
      plate: "REGI03",
      make: "Ford",
      model: "F-150",
      year: 2021,
      nickname: "Weekend Truck",
      bodyClass: "Pickup",
      registrationExpiresOn: daysFromToday(-12),
      seedKey: "expired",
    },
  ] as const;

  const registrationsByKey: Record<string, { id: string }> = {};

  for (const spec of registrationSpecs) {
    const existing = await prisma.registration.findFirst({
      where: {
        householdId: household.id,
        plate: spec.plate,
        state: "UT",
      },
    });

    const data = {
      householdId: household.id,
      type: "passenger" as const,
      vin: spec.vin,
      plate: spec.plate,
      state: "UT",
      make: spec.make,
      model: spec.model,
      year: spec.year,
      nickname: spec.nickname,
      bodyClass: spec.bodyClass,
      details: {},
      registrationExpiresOn: spec.registrationExpiresOn,
      createdBy: user.id,
    };

    const registration = existing
      ? await prisma.registration.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.registration.create({ data });

    registrationsByKey[spec.seedKey] = registration;
  }

  // 5) Demo renewal in progress (Reviewing) on Due Soon registration
  const dueSoonRegistration = registrationsByKey.due_soon;
  const existingRenewal = await prisma.renewal.findFirst({
    where: {
      registrationId: dueSoonRegistration.id,
      requestedBy: user.id,
      status: RenewalStatus.Reviewing,
    },
  });

  const feeBreakdown = {
    currency: "USD",
    registrationFeeCents: UTAH_STATE_RULES_CONFIG.fees.registrationFeeCents,
    regiServiceFeeCents: UTAH_STATE_RULES_CONFIG.fees.regiServiceFeeCents,
    lateFeeCents: 0,
    totalCents:
      UTAH_STATE_RULES_CONFIG.fees.registrationFeeCents +
      UTAH_STATE_RULES_CONFIG.fees.regiServiceFeeCents,
  };

  if (existingRenewal) {
    await prisma.renewal.update({
      where: { id: existingRenewal.id },
      data: {
        feeBreakdown,
        documentsReceivedAt:
          existingRenewal.documentsReceivedAt ?? new Date(),
        reviewingAt: existingRenewal.reviewingAt ?? new Date(),
        staffNotes: "Seed demo renewal — documents look complete.",
      },
    });
  } else {
    await prisma.renewal.create({
      data: {
        registrationId: dueSoonRegistration.id,
        status: RenewalStatus.Reviewing,
        requestedBy: user.id,
        feeBreakdown,
        requestedAt: new Date(),
        documentsReceivedAt: new Date(),
        reviewingAt: new Date(),
        staffNotes: "Seed demo renewal — documents look complete.",
      },
    });
  }

  // 6) Demo viewer member (shared household access)
  const viewer = await prisma.user.upsert({
    where: { firebaseUid: DEMO_VIEWER_FIREBASE_UID },
    create: {
      firebaseUid: DEMO_VIEWER_FIREBASE_UID,
      email: DEMO_VIEWER_EMAIL,
      name: "Sam Viewer",
      phone: "+18015550101",
      notificationPrefs: {
        push: true,
        email: true,
        sms: false,
      },
    },
    update: {
      email: DEMO_VIEWER_EMAIL,
      name: "Sam Viewer",
      phone: "+18015550101",
      notificationPrefs: {
        push: true,
        email: true,
        sms: false,
      },
    },
  });

  // Viewer's own household-of-one (so they can also add personal registrations).
  let viewerHousehold = await prisma.household.findFirst({
    where: { ownerUserId: viewer.id },
  });
  if (!viewerHousehold) {
    viewerHousehold = await prisma.household.create({
      data: {
        name: "Sam's Household",
        ownerUserId: viewer.id,
      },
    });
  }
  await prisma.householdMember.upsert({
    where: {
      householdId_userId: {
        householdId: viewerHousehold.id,
        userId: viewer.id,
      },
    },
    create: {
      householdId: viewerHousehold.id,
      userId: viewer.id,
      role: "owner",
      inviteStatus: "accepted",
    },
    update: {
      role: "owner",
      inviteStatus: "accepted",
    },
  });

  // Accepted viewer membership on the demo household.
  const existingViewerMembership = await prisma.householdMember.findFirst({
    where: {
      householdId: household.id,
      OR: [{ userId: viewer.id }, { inviteEmail: DEMO_VIEWER_EMAIL }],
    },
  });
  if (existingViewerMembership) {
    await prisma.householdMember.update({
      where: { id: existingViewerMembership.id },
      data: {
        userId: viewer.id,
        inviteEmail: DEMO_VIEWER_EMAIL,
        inviteToken: null,
        role: "viewer",
        inviteStatus: "accepted",
      },
    });
  } else {
    await prisma.householdMember.create({
      data: {
        householdId: household.id,
        userId: viewer.id,
        inviteEmail: DEMO_VIEWER_EMAIL,
        role: "viewer",
        inviteStatus: "accepted",
      },
    });
  }

  // 7) Waitlist examples for non-Utah states
  const waitlistRows = [
    { email: "casey@example.com", state: "CA" },
    { email: "jordan@example.com", state: "AZ" },
  ] as const;

  for (const row of waitlistRows) {
    await prisma.waitlist.upsert({
      where: {
        email_state: { email: row.email, state: row.state },
      },
      create: row,
      update: {},
    });
  }

  // 8) Staff allowlist (admin portal)
  for (const staff of STAFF_SEEDS) {
    await prisma.staffUser.upsert({
      where: { firebaseUid: staff.firebaseUid },
      create: {
        firebaseUid: staff.firebaseUid,
        name: staff.name,
        role: staff.role,
      },
      update: {
        name: staff.name,
        role: staff.role,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  state_rules: UT`);
  console.log(`  user: ${user.email} (${user.id})`);
  console.log(`  viewer: ${viewer.email} (${viewer.id}) — viewer on demo household`);
  console.log(`  household: ${household.id}`);
  console.log(
    `  registrations: Current=${registrationsByKey.current.id}, DueSoon=${registrationsByKey.due_soon.id}, Expired=${registrationsByKey.expired.id}`,
  );
  console.log(`  waitlist: ${waitlistRows.length} rows`);
  console.log(
    `  staff_users: ${STAFF_SEEDS.map((s) => `${s.name} (${s.firebaseUid})`).join(", ")}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
