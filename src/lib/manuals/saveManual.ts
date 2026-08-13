import type { OwnerManualSource, Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function saveOwnerManualOnRegistration(input: {
  registrationId: string;
  url: string;
  source: OwnerManualSource;
}): Promise<Registration> {
  return prisma.registration.update({
    where: { id: input.registrationId },
    data: {
      ownerManualUrl: input.url,
      ownerManualSource: input.source,
      ownerManualFoundAt: new Date(),
    },
  });
}
