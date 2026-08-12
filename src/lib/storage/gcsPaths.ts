/** True for private garage hero photos — these must not become vault documents. */
export function isVehiclePhotoGcsPath(gcsPath: string): boolean {
  return /\/registrations\/[^/]+\/photo\//.test(gcsPath);
}

/**
 * Object-key prefix for every file belonging to a household.
 * Rejects ids that could escape the prefix (path separators / `..`).
 */
export function householdGcsPrefix(householdId: string): string {
  const id = householdId.trim();
  if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) {
    throw new Error("Invalid household id for GCS prefix");
  }
  return `households/${id}/`;
}

export function isRegistrationDocumentGcsPath(
  gcsPath: string,
  input: { householdId: string; registrationId: string },
): boolean {
  const prefix = `households/${input.householdId}/registrations/${input.registrationId}/`;
  return (
    gcsPath.startsWith(prefix) &&
    !gcsPath.includes("..") &&
    !isVehiclePhotoGcsPath(gcsPath)
  );
}
