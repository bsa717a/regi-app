import type { StateRulesConfig } from "@/lib/stateEngine/types";

/**
 * Narrow unknown jsonb from `state_rules.config` into StateRulesConfig.
 * Returns null when the shape is unusable (missing due-soon threshold).
 */
function asConfigRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readDueSoonThresholdDays(value: unknown): number | null {
  const raw =
    typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : value;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return raw;
}

export function parseStateRulesConfig(value: unknown): StateRulesConfig | null {
  const record = asConfigRecord(value);
  if (!record) {
    return null;
  }

  const renewalWindow = record.renewalWindow;
  if (
    !renewalWindow ||
    typeof renewalWindow !== "object" ||
    Array.isArray(renewalWindow)
  ) {
    return null;
  }

  const windowRecord = renewalWindow as Record<string, unknown>;
  const dueSoonThresholdDays = readDueSoonThresholdDays(
    windowRecord.dueSoonThresholdDays,
  );
  if (dueSoonThresholdDays == null) {
    return null;
  }

  const registrationTypes = Array.isArray(record.registrationTypes)
    ? record.registrationTypes
    : [];

  return {
    ...(record as StateRulesConfig),
    renewalWindow: {
      ...(windowRecord as StateRulesConfig["renewalWindow"]),
      dueSoonThresholdDays,
    },
    registrationTypes: registrationTypes as StateRulesConfig["registrationTypes"],
  };
}

/** Read the Due Soon threshold — always from state_rules.config, never a constant. */
export function getDueSoonThresholdDays(config: StateRulesConfig): number {
  return config.renewalWindow.dueSoonThresholdDays;
}
