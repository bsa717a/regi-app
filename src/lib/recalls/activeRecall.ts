import type { RegistrationRecall } from "@prisma/client";

/** Open recalls still returned by the most recent NHTSA sync for this registration. */
export function isActiveOpenRecall(
  recall: Pick<RegistrationRecall, "status" | "lastSeenAt">,
  recallsCheckedAt: Date | null | undefined,
): boolean {
  if (recall.status !== "open") return false;
  if (!recallsCheckedAt) return false;
  return recall.lastSeenAt.getTime() >= recallsCheckedAt.getTime();
}
