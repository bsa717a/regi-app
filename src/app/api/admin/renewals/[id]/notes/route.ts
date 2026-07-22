import { NextResponse } from "next/server";
import { appendStaffNote, parseNoteBody } from "@/lib/admin/notes";
import { verifyStaff } from "@/lib/auth/verifyStaff";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/renewals/[id]/notes
 * Body: { note: string }
 * Appends a staff note and writes audit_log.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await verifyStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Renewal id is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseNoteBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const renewal = await appendStaffNote(
      {
        renewalId: id.trim(),
        note: parsed.note,
        staff: auth.staff,
      },
      { db: prisma },
    );

    return NextResponse.json({
      staffNotes: renewal.staffNotes,
      renewalId: renewal.id,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Renewal not found") {
      return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
    }
    console.error("[admin/renewals/notes]", err);
    return NextResponse.json(
      { error: "Could not add staff note" },
      { status: 500 },
    );
  }
}
