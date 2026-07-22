/** Format USD cents for fee estimates (e.g. 4400 → "$44.00"). */
export function formatUsdCents(cents: number): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
