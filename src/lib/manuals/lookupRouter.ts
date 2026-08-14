import type { Registration } from "@prisma/client";
import {
  buildOwnerManualFilename,
} from "@/lib/manuals/persistOwnerManual";
import { resolveOfficialManualLibrary } from "@/lib/manuals/libraries";
import {
  isVehicleDatabasesConfigured,
  lookupVehicleDatabasesOwnerManual,
} from "@/lib/manuals/lookupPaid";
import { readPaidProviderManualUrl, readPdfManualUrl } from "@/lib/manuals/validateUrl";

export type ManualLookupSavedResult = {
  ok: true;
  kind: "saved";
  documentId: string;
  filename: string;
  source: "free" | "paid";
  cached?: boolean;
};

export type ManualLookupPdfCandidateResult = {
  ok: true;
  kind: "pdf";
  previewUrl: string;
  filename: string;
  libraryUrl: string;
  libraryLabel: string;
};

export type ManualLookupLibraryResult = {
  ok: true;
  kind: "library";
  url: string;
  label: string;
  message: string;
};

export type ManualLookupRouterFailure = {
  ok: false;
  error: string;
  code?: "invalid" | "not_found" | "unconfigured";
};

export type ManualLookupRouterResult =
  | ManualLookupSavedResult
  | ManualLookupPdfCandidateResult
  | ManualLookupLibraryResult
  | ManualLookupRouterFailure;

function filenameFromPdfUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop();
    if (!last?.toLowerCase().endsWith(".pdf")) return null;
    return decodeURIComponent(last);
  } catch {
    return null;
  }
}

function libraryMessage(input: Pick<Registration, "type">): string {
  switch (input.type) {
    case "motorhome":
      return "RV manuals are often split between the coach builder and the chassis manufacturer. Open the official library to find the right document.";
    case "ohv":
    case "snowmobile":
      return "ATV and powersports manuals are usually on the manufacturer’s owner-resources site.";
    case "boat":
      return "Boat manuals are often organized by engine or hull brand on the manufacturer site.";
    case "trailer":
      return "Trailer manuals vary by brand. Try the manufacturer library if you know who built it.";
    default:
      return "We couldn’t fetch a PDF automatically. Open the official manufacturer manuals page to find yours.";
  }
}

function legacyStoredPdfCandidate(
  registration: Registration,
): { previewUrl: string; filename: string } | null {
  if (registration.ownerManualDocumentId || !registration.ownerManualUrl) {
    return null;
  }

  const context = {
    make: registration.make,
    model: registration.model,
    year: registration.year,
  };
  const validated =
    readPaidProviderManualUrl(registration.ownerManualUrl) ??
    readPdfManualUrl(registration.ownerManualUrl, context);
  if (!validated) return null;

  return {
    previewUrl: validated,
    filename:
      filenameFromPdfUrl(validated) ?? buildOwnerManualFilename(registration),
  };
}

async function lookupPassengerPdfCandidate(
  registration: Registration,
): Promise<{ previewUrl: string; filename: string } | null> {
  if (registration.type !== "passenger") return null;
  if (!isVehicleDatabasesConfigured()) return null;

  const result = await lookupVehicleDatabasesOwnerManual(registration);
  if (!result.ok) return null;

  const validated = readPaidProviderManualUrl(result.url);
  if (!validated) return null;

  return {
    previewUrl: validated,
    filename:
      filenameFromPdfUrl(validated) ??
      buildOwnerManualFilename(registration),
  };
}

export async function routeOwnerManualLookup(input: {
  registration: Registration;
  saved?: ManualLookupSavedResult | null;
}): Promise<ManualLookupRouterResult> {
  if (input.saved) {
    return input.saved;
  }

  if (
    !input.registration.year &&
    !input.registration.make &&
    !input.registration.model &&
    !input.registration.vin
  ) {
    return {
      ok: false,
      code: "invalid",
      error: "Add a VIN or year, make, and model to search for a manual.",
    };
  }

  const library = resolveOfficialManualLibrary({
    type: input.registration.type,
    make: input.registration.make,
    model: input.registration.model,
    year: input.registration.year,
  });

  const legacyPdf = legacyStoredPdfCandidate(input.registration);
  if (legacyPdf) {
    return {
      ok: true,
      kind: "pdf",
      previewUrl: legacyPdf.previewUrl,
      filename: legacyPdf.filename,
      libraryUrl: library.url,
      libraryLabel: library.label,
    };
  }

  const pdfCandidate = await lookupPassengerPdfCandidate(input.registration);
  if (pdfCandidate) {
    return {
      ok: true,
      kind: "pdf",
      previewUrl: pdfCandidate.previewUrl,
      filename: pdfCandidate.filename,
      libraryUrl: library.url,
      libraryLabel: library.label,
    };
  }

  return {
    ok: true,
    kind: "library",
    url: library.url,
    label: library.label,
    message: libraryMessage(input.registration),
  };
}
