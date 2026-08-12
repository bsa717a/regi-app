export const DELETE_ACCOUNT_CONFIRMATION = "DELETE";

export function isDeleteConfirmation(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return (body as { confirm?: unknown }).confirm === DELETE_ACCOUNT_CONFIRMATION;
}
