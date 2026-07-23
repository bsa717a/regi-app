import { isoDayFromDate, utcDateFromIsoDay } from "./validation";

/** Compute a UTC calendar date X days from `asOf` (default today). */
export function remindOnFromDays(
  remindInDays: number,
  asOf: Date = new Date(),
): Date {
  const base = utcDateFromIsoDay(isoDayFromDate(asOf));
  base.setUTCDate(base.getUTCDate() + remindInDays);
  return base;
}
