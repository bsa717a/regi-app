import { NextResponse } from "next/server";
import {
  serializeAdminRenewalDetail,
  serializeDocument,
  type AdminDocumentWithUrl,
} from "@/lib/admin/serialize";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";
import { createDownloadSignedUrl } from "@/lib/storage/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/renewals/[id]
 * Full renewal detail for staff: registration, owner, docs (signed URLs), fees,
 * status history, notes, payment status n/a (MVP).
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Renewal id is required" }, { status: 400 });
  }

  const renewal = await prisma.renewal.findUnique({
    where: { id: id.trim() },
    include: {
      registration: true,
      requester: {
        select: { id: true, email: true, name: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!renewal) {
    return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
  }

  const documentsWithUrls: AdminDocumentWithUrl[] = await Promise.all(
    renewal.documents.map(async (doc) => {
      const base = serializeDocument(doc);
      try {
        const signed = await createDownloadSignedUrl({
          gcsPath: doc.gcsPath,
          filename: doc.originalFilename,
        });
        return {
          ...base,
          downloadUrl: signed.downloadUrl,
          downloadExpiresAt: signed.expiresAt.toISOString(),
        };
      } catch {
        return {
          ...base,
          downloadUrl: null,
          downloadExpiresAt: null,
        };
      }
    }),
  );

  return NextResponse.json({
    renewal: serializeAdminRenewalDetail(renewal, documentsWithUrls),
  });
}
