import type { PatchRecallInput, RecallStatus } from "./types";

const VALID_STATUSES: RecallStatus[] = ["open", "completed", "not_applicable"];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalString(
  value: unknown,
  field: string,
): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }
  const trimmed = value.trim();
  return { ok: true, value: trimmed.length ? trimmed : null };
}

export function parsePatchRecallBody(
  body: unknown,
): { ok: true; value: PatchRecallInput } | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Invalid request body" };
  }

  const result: PatchRecallInput = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUSES.includes(body.status as RecallStatus)) {
      return {
        ok: false,
        error: "status must be open, completed, or not_applicable",
      };
    }
    result.status = body.status as RecallStatus;
  }

  const notes = parseOptionalString(body.userNotes, "userNotes");
  if (!notes.ok) return notes;
  if (notes.value !== undefined) result.userNotes = notes.value;

  if (result.status === undefined && result.userNotes === undefined) {
    return { ok: false, error: "Provide status and/or userNotes to update" };
  }

  return { ok: true, value: result };
}
