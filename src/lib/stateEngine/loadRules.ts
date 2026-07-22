import { prisma } from "@/lib/prisma";
import {
  parseStateRulesConfig,
  getDueSoonThresholdDays,
} from "@/lib/stateEngine/parseConfig";
import type { StateRulesConfig } from "@/lib/stateEngine/types";

/**
 * Load active state_rules configs keyed by state code.
 * All state-specific thresholds come from these rows.
 */
export async function loadStateRulesMap(
  stateCodes: string[],
): Promise<Map<string, StateRulesConfig>> {
  const unique = [...new Set(stateCodes.map((s) => s.toUpperCase()))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.stateRule.findMany({
    where: {
      stateCode: { in: unique },
      active: true,
    },
  });

  const map = new Map<string, StateRulesConfig>();
  for (const row of rows) {
    const config = parseStateRulesConfig(row.config);
    if (config) {
      // Touch threshold so callers cannot skip config accidentally.
      void getDueSoonThresholdDays(config);
      map.set(row.stateCode.toUpperCase(), config);
    }
  }
  return map;
}

export async function loadStateRules(
  stateCode: string,
): Promise<StateRulesConfig | null> {
  const map = await loadStateRulesMap([stateCode]);
  return map.get(stateCode.toUpperCase()) ?? null;
}
