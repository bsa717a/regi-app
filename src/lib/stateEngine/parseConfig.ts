import type { StateRulesConfig } from "@/lib/stateEngine/types";

/**
 * Narrow unknown jsonb from `state_rules.config` into StateRulesConfig.
 * Returns null when the shape is unusable (missing due-soon threshold).
 */
export function parseStateRulesConfig(value: unknown): StateRulesConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const renewalWindow = record.renewalWindow;
  if (
    !renewalWindow ||
    typeof renewalWindow !== "object" ||
    Array.isArray(renewalWindow)
  ) {
    return null;
  }

  const windowRecord = renewalWindow as Record<string, unknown>;
  const dueSoonThresholdDays = windowRecord.dueSoonThresholdDays;
  if (
    typeof dueSoonThresholdDays !== "number" ||
    !Number.isFinite(dueSoonThresholdDays) ||
    dueSoonThresholdDays < 0
  ) {
    return null;
  }

  const registrationTypes = Array.isArray(record.registrationTypes)
    ? record.registrationTypes
    : [];

  return {
    ...(value as StateRulesConfig),
    registrationTypes: registrationTypes as StateRulesConfig["registrationTypes"],
  };
}

/** Read the Due Soon threshold — always from state_rules.config, never a constant. */
export function getDueSoonThresholdDays(config: StateRulesConfig): number {
  return config.renewalWindow.dueSoonThresholdDays;
}
