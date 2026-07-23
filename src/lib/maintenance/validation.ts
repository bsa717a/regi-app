import type {
  CreateMaintenanceLogInput,
  CreateMaintenanceTaskInput,
  CreateUsageReadingInput,
  PatchMaintenanceTaskInput,
} from "./types";

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

function parseOptionalNumber(
  value: unknown,
  field: string,
  opts?: { min?: number; integer?: boolean },
): { ok: true; value: number | null | undefined } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === "") return { ok: true, value: null };
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return { ok: false, error: `${field} must be a number` };
  }
  if (opts?.integer && !Number.isInteger(num)) {
    return { ok: false, error: `${field} must be an integer` };
  }
  if (opts?.min != null && num < opts.min) {
    return { ok: false, error: `${field} must be at least ${opts.min}` };
  }
  return { ok: true, value: num };
}

function parseIsoDate(
  value: unknown,
  field: string,
  required: boolean,
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    if (required) return { ok: false, error: `${field} is required` };
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a date string (YYYY-MM-DD)` };
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: `${field} must be YYYY-MM-DD` };
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m! - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, error: `${field} is not a valid date` };
  }
  return { ok: true, value: trimmed };
}

function hasAtLeastOneInterval(input: {
  intervalMonths?: number | null;
  intervalHours?: number | null;
  intervalMiles?: number | null;
}): boolean {
  return (
    (input.intervalMonths != null && input.intervalMonths > 0) ||
    (input.intervalHours != null && input.intervalHours > 0) ||
    (input.intervalMiles != null && input.intervalMiles > 0)
  );
}

export function parseCreateTaskBody(
  body: unknown,
):
  | { ok: true; data: CreateMaintenanceTaskInput }
  | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const name = parseOptionalString(body.name, "name");
  if (!name.ok) return name;
  const presetKey = parseOptionalString(body.presetKey, "presetKey");
  if (!presetKey.ok) return presetKey;
  const notes = parseOptionalString(body.notes, "notes");
  if (!notes.ok) return notes;

  const intervalMonths = parseOptionalNumber(body.intervalMonths, "intervalMonths", {
    min: 1,
    integer: true,
  });
  if (!intervalMonths.ok) return intervalMonths;
  const intervalHours = parseOptionalNumber(body.intervalHours, "intervalHours", {
    min: 0.1,
  });
  if (!intervalHours.ok) return intervalHours;
  const intervalMiles = parseOptionalNumber(body.intervalMiles, "intervalMiles", {
    min: 0.1,
  });
  if (!intervalMiles.ok) return intervalMiles;

  if (!presetKey.value && !name.value) {
    return { ok: false, error: "name or presetKey is required" };
  }

  if (
    !presetKey.value &&
    !hasAtLeastOneInterval({
      intervalMonths: intervalMonths.value,
      intervalHours: intervalHours.value,
      intervalMiles: intervalMiles.value,
    })
  ) {
    return {
      ok: false,
      error: "At least one interval (months, hours, or miles) is required",
    };
  }

  const remindInDays = parseOptionalNumber(body.remindInDays, "remindInDays", {
    min: 1,
    integer: true,
  });
  if (!remindInDays.ok) return remindInDays;
  if (remindInDays.value != null && remindInDays.value > 365) {
    return { ok: false, error: "remindInDays must be 365 or less" };
  }

  return {
    ok: true,
    data: {
      name: name.value ?? undefined,
      presetKey: presetKey.value ?? undefined,
      intervalMonths: intervalMonths.value,
      intervalHours: intervalHours.value,
      intervalMiles: intervalMiles.value,
      notes: notes.value,
      remindInDays: remindInDays.value,
    },
  };
}

export function parsePatchTaskBody(
  body: unknown,
):
  | { ok: true; data: PatchMaintenanceTaskInput }
  | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const data: PatchMaintenanceTaskInput = {};

  if (body.name !== undefined) {
    const name = parseOptionalString(body.name, "name");
    if (!name.ok) return name;
    if (!name.value) return { ok: false, error: "name cannot be empty" };
    data.name = name.value;
  }

  if (body.notes !== undefined) {
    const notes = parseOptionalString(body.notes, "notes");
    if (!notes.ok) return notes;
    data.notes = notes.value;
  }

  if (body.intervalMonths !== undefined) {
    const intervalMonths = parseOptionalNumber(
      body.intervalMonths,
      "intervalMonths",
      { min: 1, integer: true },
    );
    if (!intervalMonths.ok) return intervalMonths;
    data.intervalMonths = intervalMonths.value;
  }

  if (body.intervalHours !== undefined) {
    const intervalHours = parseOptionalNumber(
      body.intervalHours,
      "intervalHours",
      { min: 0.1 },
    );
    if (!intervalHours.ok) return intervalHours;
    data.intervalHours = intervalHours.value;
  }

  if (body.intervalMiles !== undefined) {
    const intervalMiles = parseOptionalNumber(
      body.intervalMiles,
      "intervalMiles",
      { min: 0.1 },
    );
    if (!intervalMiles.ok) return intervalMiles;
    data.intervalMiles = intervalMiles.value;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return { ok: false, error: "active must be a boolean" };
    }
    data.active = body.active;
  }

  if (body.clearRemind !== undefined) {
    if (typeof body.clearRemind !== "boolean") {
      return { ok: false, error: "clearRemind must be a boolean" };
    }
    data.clearRemind = body.clearRemind;
  }

  if (body.remindInDays !== undefined) {
    const remindInDays = parseOptionalNumber(
      body.remindInDays,
      "remindInDays",
      { min: 1, integer: true },
    );
    if (!remindInDays.ok) return remindInDays;
    if (remindInDays.value != null && remindInDays.value > 365) {
      return { ok: false, error: "remindInDays must be 365 or less" };
    }
    data.remindInDays = remindInDays.value;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  return { ok: true, data };
}

export function parseCreateLogBody(
  body: unknown,
):
  | { ok: true; data: CreateMaintenanceLogInput }
  | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const performedOn = parseIsoDate(body.performedOn, "performedOn", true);
  if (!performedOn.ok) return performedOn;

  const taskId = parseOptionalString(body.taskId, "taskId");
  if (!taskId.ok) return taskId;
  const notes = parseOptionalString(body.notes, "notes");
  if (!notes.ok) return notes;

  const hoursAtService = parseOptionalNumber(
    body.hoursAtService,
    "hoursAtService",
    { min: 0 },
  );
  if (!hoursAtService.ok) return hoursAtService;
  const milesAtService = parseOptionalNumber(
    body.milesAtService,
    "milesAtService",
    { min: 0 },
  );
  if (!milesAtService.ok) return milesAtService;
  const costCents = parseOptionalNumber(body.costCents, "costCents", {
    min: 0,
    integer: true,
  });
  if (!costCents.ok) return costCents;

  return {
    ok: true,
    data: {
      taskId: taskId.value,
      performedOn: performedOn.value!,
      hoursAtService: hoursAtService.value,
      milesAtService: milesAtService.value,
      costCents: costCents.value,
      notes: notes.value,
    },
  };
}

export function parseCreateUsageBody(
  body: unknown,
):
  | { ok: true; data: CreateUsageReadingInput }
  | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Invalid JSON body" };
  }

  const readingOn = parseIsoDate(body.readingOn, "readingOn", false);
  if (!readingOn.ok) return readingOn;

  const hours = parseOptionalNumber(body.hours, "hours", { min: 0 });
  if (!hours.ok) return hours;
  const miles = parseOptionalNumber(body.miles, "miles", { min: 0 });
  if (!miles.ok) return miles;

  if (hours.value == null && miles.value == null) {
    return { ok: false, error: "hours or miles is required" };
  }

  return {
    ok: true,
    data: {
      readingOn: readingOn.value,
      hours: hours.value,
      miles: miles.value,
    },
  };
}

export function utcDateFromIsoDay(isoDay: string): Date {
  const [y, m, d] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function isoDayFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
