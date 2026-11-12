import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObjectFile } from "@/lib/storage/gcs";
import {
  catalogGcsPath,
  isSafeCatalogId,
  readLocalCatalogWebp,
} from "@/lib/registrations/vehicleCatalog/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isSafeCatalogId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = await prisma.vehicleCatalogImage.findUnique({ where: { id } });
  if (!row || row.status !== "ready") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let bytes: Buffer | null = null;
  if (row.gcsPath && row.gcsPath === catalogGcsPath(id)) {
    const [downloaded] = await getObjectFile(row.gcsPath).download();
    bytes = downloaded;
  } else if (row.storagePath) {
    bytes = await readLocalCatalogWebp(row.storagePath);
  }

  if (!bytes) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
