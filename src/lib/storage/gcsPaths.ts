/** True for private garage hero photos — these must not become vault documents. */
export function isVehiclePhotoGcsPath(gcsPath: string): boolean {
  return /\/registrations\/[^/]+\/photo\//.test(gcsPath);
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
