import type { NhtsaRecallRow } from "./types";

const NHTSA_RECALLS_BASE = "https://api.nhtsa.gov/recalls/recallsByVehicle";

type RawNhtsaRecall = {
  NHTSACampaignNumber?: string;
  Manufacturer?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  Remedy?: string;
  Notes?: string;
  ReportReceivedDate?: string;
  parkIt?: boolean;
  parkOutSide?: boolean;
  overTheAirUpdate?: boolean;
};

type NhtsaRecallsResponse = {
  Count?: number;
  Message?: string;
  results?: RawNhtsaRecall[];
};

function cleanField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function parseNhtsaRecallRow(row: RawNhtsaRecall): NhtsaRecallRow | null {
  const campaign = cleanField(row.NHTSACampaignNumber);
  if (!campaign) return null;

  return {
    nhtsaCampaignNumber: campaign,
    manufacturer: cleanField(row.Manufacturer),
    component: cleanField(row.Component),
    summary: cleanField(row.Summary),
    consequence: cleanField(row.Consequence),
    remedy: cleanField(row.Remedy),
    notesFromNhtsa: cleanField(row.Notes),
    reportReceivedDate: cleanField(row.ReportReceivedDate),
    parkIt: row.parkIt === true,
    parkOutside: row.parkOutSide === true,
    overTheAirUpdate: row.overTheAirUpdate === true,
  };
}

export function parseNhtsaRecallsResponse(
  data: NhtsaRecallsResponse,
): NhtsaRecallRow[] {
  const rows = data.results ?? [];
  const parsed: NhtsaRecallRow[] = [];
  for (const row of rows) {
    const recall = parseNhtsaRecallRow(row);
    if (recall) parsed.push(recall);
  }
  return parsed;
}

type FetchLike = typeof fetch;

export type FetchRecallsOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

export type FetchRecallsResult =
  | { ok: true; recalls: NhtsaRecallRow[] }
  | { ok: false; error: string };

/**
 * Fetch NHTSA safety recalls for a year/make/model combination.
 * Count: 0 is a successful empty result, not an error.
 */
export async function fetchRecallsByVehicle(
  year: number,
  make: string,
  model: string,
  options: FetchRecallsOptions = {},
): Promise<FetchRecallsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;

  const params = new URLSearchParams({
    make: make.trim(),
    model: model.trim(),
    modelYear: String(year),
  });
  const url = `${NHTSA_RECALLS_BASE}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        ok: false,
        error: "Recall lookup is unavailable right now. Try again later.",
      };
    }

    const data = (await response.json()) as NhtsaRecallsResponse;
    return { ok: true, recalls: parseNhtsaRecallsResponse(data) };
  } catch {
    return {
      ok: false,
      error: "Recall lookup timed out. Try again later.",
    };
  } finally {
    clearTimeout(timer);
  }
}
