export type CatalogQueryInput = {
  year: number;
  make: string;
  model: string;
};

export function parseCatalogQuery(body: unknown): CatalogQueryInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const year =
    typeof record.year === "number" ? record.year : Number(record.year);
  const make = typeof record.make === "string" ? record.make.trim() : "";
  const model = typeof record.model === "string" ? record.model.trim() : "";
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  if (make.length < 1 || make.length > 40 || model.length < 1 || model.length > 40) {
    return null;
  }
  if (/[\u0000-\u001f]/.test(make) || /[\u0000-\u001f]/.test(model)) return null;
  return { year, make, model };
}
