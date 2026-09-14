/**
 * Idempotent seed for REGI local/dev.
 * Run: npx prisma db seed
 */
import { AppRole, PrismaClient, RenewalStatus, StaffRole } from "@prisma/client";
import { resolveStagingDemoApplicant } from "../src/lib/deploy/stagingDemoApplicant";
import { UTAH_STATE_RULES_CONFIG } from "../src/lib/stateEngine/utahConfig";

export { UTAH_STATE_RULES_CONFIG };

const prisma = new PrismaClient();

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
      addressLine1: "123 State St",
      city: "Salt Lake City",
      addressState: "UT",
      postalCode: "84111",
      role: AppRole.admin,
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
      addressLine1: "123 State St",
      city: "Salt Lake City",
      addressState: "UT",
      postalCode: "84111",
      role: AppRole.admin,
      notificationPrefs: {
        push: true,
        email: true,
        sms: false,
      },
    },
  });

  // 2b) Priority 2 hook — real Firebase applicant on a non-prod DB only.
  const stagingApplicant = resolveStagingDemoApplicant(process.env);
  if (stagingApplicant) {
    await prisma.user.upsert({
      where: { firebaseUid: stagingApplicant.firebaseUid },
      create: {
        firebaseUid: stagingApplicant.firebaseUid,
        email: stagingApplicant.email,
        name: "Staging Demo Applicant",
        role: AppRole.user,
      },
      update: {
        email: stagingApplicant.email,
        name: "Staging Demo Applicant",
      },
    });
    console.log(
      `  staging demo applicant: ${stagingApplicant.email} (${stagingApplicant.firebaseUid})`,
    );
  }

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

  // 5b) Terminal StickerMailed renewal on the current registration (history + proof)
  const currentRegistration = registrationsByKey.current;
  const mailedFeeBreakdown = {
    currency: "USD",
    registrationFeeCents: UTAH_STATE_RULES_CONFIG.fees.registrationFeeCents,
    regiServiceFeeCents: UTAH_STATE_RULES_CONFIG.fees.regiServiceFeeCents,
    lateFeeCents: 0,
    totalCents:
      UTAH_STATE_RULES_CONFIG.fees.registrationFeeCents +
      UTAH_STATE_RULES_CONFIG.fees.regiServiceFeeCents,
    isEstimate: true,
  };
  const existingMailed = await prisma.renewal.findFirst({
    where: {
      registrationId: currentRegistration.id,
      requestedBy: user.id,
      status: RenewalStatus.StickerMailed,
    },
  });
  const mailedTimes = {
    requestedAt: daysFromToday(-50),
    documentsReceivedAt: daysFromToday(-48),
    reviewingAt: daysFromToday(-47),
    processingAt: daysFromToday(-46),
    submittedAt: daysFromToday(-45),
    completedAt: daysFromToday(-42),
    stickerMailedAt: daysFromToday(-40),
  };
  if (existingMailed) {
    await prisma.renewal.update({
      where: { id: existingMailed.id },
      data: {
        feeBreakdown: mailedFeeBreakdown,
        ...mailedTimes,
        staffNotes: "Seed demo — sticker mailed; confirmation is available.",
      },
    });
  } else {
    await prisma.renewal.create({
      data: {
        registrationId: currentRegistration.id,
        status: RenewalStatus.StickerMailed,
        requestedBy: user.id,
        feeBreakdown: mailedFeeBreakdown,
        ...mailedTimes,
        staffNotes: "Seed demo — sticker mailed; confirmation is available.",
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
