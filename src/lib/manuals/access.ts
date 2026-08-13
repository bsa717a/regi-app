import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userCanAccessHousehold } from "@/lib/registrations/household";

export async function loadAuthorizedRegistrationForManual(
  userId: string,
  registrationId: string,
) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!registration) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const allowed = await userCanAccessHousehold(userId, registration.householdId);
  if (!allowed) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { registration };
}
