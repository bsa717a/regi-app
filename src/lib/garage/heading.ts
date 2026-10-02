/**
 * Visible garage title and the matching document-title segment.
 * "Derek's Garage", "James' Garage", or "Your Garage".
 */
export function garageHeading(name: string | null | undefined): string {
  const first = firstName(name);
  if (!first) return "Your Garage";
  const possessive = endsWithS(first) ? `${first}'` : `${first}'s`;
  return `${possessive} Garage`;
}

/**
 * Accessible name of the garage page heading.
 * Anchored so it does not also match the empty-state heading
 * "Your garage is empty". Still accepts the pre-personalization
 * title "Garage" on durable staging until this header ships.
 */
export const GARAGE_PAGE_HEADING = /^(?:Garage|.+ Garage)$/;

function firstName(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const token = trimmed.split(/\s+/)[0];
  return token || null;
}

function endsWithS(name: string): boolean {
  const last = name[name.length - 1];
  return last === "s" || last === "S";
}
