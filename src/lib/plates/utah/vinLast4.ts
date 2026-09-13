/** Last four VIN characters for MVP vehicle lookup — never a prefill. */
export function utahVinLast4(vin: string | null | undefined): string | null {
  const normalized = vin?.replace(/[\s-]/g, "").toUpperCase() ?? "";
  if (normalized.length < 4) return null;
  return normalized.slice(-4);
}
