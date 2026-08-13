import type { Registration } from "@prisma/client";
import { MANUAL_PAID_PROVIDER } from "@/lib/manuals/constants";
import { readPaidProviderManualUrl } from "@/lib/manuals/validateUrl";

type VehicleDatabasesResponse = {
  status?: string;
  data?: {
    path?: string;
    year?: string;
    make?: string;
    model?: string;
  };
  error?: string;
  message?: string;
};

function getVehicleDatabasesApiKey(): string | null {
  return process.env.VEHICLE_DATABASES_API_KEY?.trim() || null;
}

export function isPaidManualLookupConfigured(): boolean {
  return Boolean(getVehicleDatabasesApiKey());
}

export function registrationSupportsPaidManualLookup(
  registration: Pick<Registration, "vin" | "year" | "make" | "model">,
): boolean {
  if (!isPaidManualLookupConfigured()) return false;
  if (registration.vin?.trim()) return true;
  return Boolean(
    registration.year && registration.make?.trim() && registration.model?.trim(),
  );
}

export function paidManualLookupPreflightError(
  registration: Pick<Registration, "vin" | "year" | "make" | "model">,
): string | null {
  if (!isPaidManualLookupConfigured()) {
    return "Paid manual lookup is not available yet.";
  }
  if (registration.vin?.trim()) return null;
  if (
    registration.year &&
    registration.make?.trim() &&
    registration.model?.trim()
  ) {
    return null;
  }
  return "Add a VIN or year, make, and model to look up a manual.";
}

export function isRetryablePaidLookupError(error: string): boolean {
  return (
    error.includes("timed out") ||
    error.includes("unavailable right now") ||
    error.includes("invalid response")
  );
}

function slugPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildLookupUrl(registration: Registration): string | null {
  const apiKey = getVehicleDatabasesApiKey();
  if (!apiKey) return null;

  const base = "https://api.vehicledatabases.com/owner-manual";

  if (registration.vin?.trim()) {
    return `${base}/${encodeURIComponent(registration.vin.trim())}`;
  }

  if (registration.year && registration.make?.trim() && registration.model?.trim()) {
    return `${base}/${registration.year}/${slugPart(registration.make)}/${slugPart(registration.model)}`;
  }

  return null;
}

export async function lookupPaidOwnerManual(
  registration: Registration,
): Promise<{ ok: true; url: string; provider: string } | { ok: false; error: string }> {
  const apiKey = getVehicleDatabasesApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: "Paid manual lookup is not configured yet.",
    };
  }

  const url = buildLookupUrl(registration);
  if (!url) {
    return {
      ok: false,
      error: "Add a VIN or year, make, and model to look up a manual.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-authkey": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    let payload: VehicleDatabasesResponse;
    try {
      payload = (await response.json()) as VehicleDatabasesResponse;
    } catch {
      return { ok: false, error: "Paid manual lookup returned an invalid response." };
    }

    if (!response.ok || payload.status !== "success") {
      const message =
        payload.message ||
        payload.error ||
        "No manual was found through the paid provider.";
      return { ok: false, error: message };
    }

    const manualUrl = readPaidProviderManualUrl(payload.data?.path);
    if (!manualUrl) {
      return { ok: false, error: "Paid provider did not return a valid manual link." };
    }

    return { ok: true, url: manualUrl, provider: MANUAL_PAID_PROVIDER };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Paid manual lookup timed out. Try again shortly." };
    }
    return { ok: false, error: "Paid manual lookup is unavailable right now." };
  } finally {
    clearTimeout(timeout);
  }
}
