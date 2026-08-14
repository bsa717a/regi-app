import type { OwnerManualSource, Registration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildGcsPath } from "@/lib/documents/validation";
import { MAX_OWNER_MANUAL_PDF_BYTES } from "@/lib/manuals/constants";
import {
  readManualUrl,
  readPaidProviderManualUrl,
  readPdfManualUrl,
} from "@/lib/manuals/validateUrl";
import {
  deleteObject,
  objectExists,
  saveObjectBuffer,
} from "@/lib/storage/gcs";

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildOwnerManualFilename(input: {
  year?: number | null;
  make?: string | null;
  model?: string | null;
}): string {
  const parts = [input.year, input.make, input.model]
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .map((value) => slugPart(String(value)));

  const base = parts.length > 0 ? parts.join("-") : "vehicle";
  return `${base}-owners-manual.pdf`;
}

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

function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString("ascii") === "%PDF";
}

export type PersistOwnerManualResult =
  | {
      ok: true;
      documentId: string;
      filename: string;
      archived: boolean;
    }
  | { ok: false; error: string; code?: "invalid" | "download" | "storage" };

export async function persistOwnerManualFromPdfUrl(input: {
  registration: Pick<
    Registration,
    | "id"
    | "householdId"
    | "year"
    | "make"
    | "model"
    | "ownerManualDocumentId"
  >;
  pdfUrl: string;
  source: OwnerManualSource;
  uploadedBy: string;
}): Promise<PersistOwnerManualResult> {
  const validatedUrl =
    readPdfManualUrl(input.pdfUrl, {
      make: input.registration.make,
      model: input.registration.model,
      year: input.registration.year,
    }) ??
    readPaidProviderManualUrl(input.pdfUrl) ??
    readManualUrl(input.pdfUrl, {
      make: input.registration.make,
      model: input.registration.model,
      year: input.registration.year,
    });
  if (!validatedUrl) {
    return {
      ok: false,
      code: "invalid",
      error: "Manual link must be a direct PDF file from the manufacturer.",
    };
  }

  if (input.registration.ownerManualDocumentId) {
    const existing = await prisma.document.findUnique({
      where: { id: input.registration.ownerManualDocumentId },
    });
    if (existing) {
      const exists = await objectExists(existing.gcsPath);
      if (exists) {
        return {
          ok: true,
          documentId: existing.id,
          filename: existing.originalFilename,
          archived: true,
        };
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let buffer: Buffer;
  try {
    const response = await fetch(validatedUrl, {
      method: "GET",
      headers: { Accept: "application/pdf,*/*" },
      signal: controller.signal,
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        ok: false,
        code: "download",
        error: "Could not download the owner’s manual PDF.",
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return {
      ok: false,
      code: "download",
      error: "Could not download the owner’s manual PDF.",
    };
  } finally {
    clearTimeout(timeout);
  }

  if (buffer.length === 0 || buffer.length > MAX_OWNER_MANUAL_PDF_BYTES) {
    return {
      ok: false,
      code: "download",
      error: "Owner’s manual PDF is unavailable or too large to save.",
    };
  }

  if (!isPdfBuffer(buffer)) {
    return {
      ok: false,
      code: "invalid",
      error: "Manual link did not return a PDF file.",
    };
  }

  const filename =
    filenameFromPdfUrl(validatedUrl) ??
    buildOwnerManualFilename(input.registration);
  const gcsPath = buildGcsPath({
    householdId: input.registration.householdId,
    registrationId: input.registration.id,
    originalFilename: filename,
  });

  try {
    await saveObjectBuffer({
      gcsPath,
      buffer,
      contentType: "application/pdf",
    });
  } catch {
    return {
      ok: false,
      code: "storage",
      error: "Could not save the owner’s manual to your garage.",
    };
  }

  const previousDocumentId = input.registration.ownerManualDocumentId;

  let document;
  try {
    document = await prisma.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        registrationId: input.registration.id,
        type: "other",
        gcsPath,
        originalFilename: filename,
        uploadedBy: input.uploadedBy,
      },
    });

    await tx.registration.update({
      where: { id: input.registration.id },
      data: {
        ownerManualUrl: validatedUrl,
        ownerManualSource: input.source,
        ownerManualFoundAt: new Date(),
        ownerManualDocumentId: created.id,
      },
    });

    return created;
  });
  } catch {
    await deleteObject(gcsPath).catch(() => undefined);
    return {
      ok: false,
      code: "storage",
      error: "Could not save the owner’s manual to your garage.",
    };
  }

  if (previousDocumentId && previousDocumentId !== document.id) {
    const previous = await prisma.document.findUnique({
      where: { id: previousDocumentId },
    });
    if (previous) {
      await deleteObject(previous.gcsPath).catch(() => undefined);
      await prisma.document.delete({ where: { id: previous.id } }).catch(() => undefined);
    }
  }

  return {
    ok: true,
    documentId: document.id,
    filename: document.originalFilename,
    archived: true,
  };
}

export function ownerManualSuccessPayload(input: {
  documentId: string;
  filename: string;
  source: OwnerManualSource;
  cached?: boolean;
  archived?: boolean;
}) {
  return {
    ok: true as const,
    kind: "saved" as const,
    documentId: input.documentId,
    filename: input.filename,
    source: input.source,
    ...(input.cached ? { cached: true } : {}),
    ...(input.archived === false ? { archived: false } : {}),
  };
}
