import type { DocumentType } from "@prisma/client";
import type {
  DocumentApplicability,
  RequiredDocumentRule,
  StateDocumentType,
  StateRulesConfig,
} from "@/lib/stateEngine/types";
import type { RequiredDocumentStatus } from "./types";

function normalizeCounty(county: string | null | undefined): string | null {
  if (!county || typeof county !== "string") return null;
  const trimmed = county.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Whether a required-document rule applies for the given county.
 * County matching is case-insensitive.
 *
 * When applicability is county-scoped and county is unknown:
 * - county_list: treat as applicable (conservative — ask user to upload or confirm county)
 * - county_exclude: treat as applicable (unknown county is not in the exclude list)
 */
export function documentApplies(
  applicability: DocumentApplicability,
  county: string | null | undefined,
): boolean {
  if (applicability.kind === "always") return true;

  const normalized = normalizeCounty(county);
  const listed = applicability.counties.map((c) => c.trim().toLowerCase());

  if (applicability.kind === "county_list") {
    if (!normalized) return true;
    return listed.includes(normalized);
  }

  // county_exclude
  if (!normalized) return true;
  return !listed.includes(normalized);
}

/** Required documents from state_rules.config that apply for this county. */
export function getApplicableRequiredDocuments(
  config: StateRulesConfig,
  county: string | null | undefined,
): RequiredDocumentRule[] {
  return config.requiredDocuments.filter(
    (rule) => rule.required && documentApplies(rule.applicability, county),
  );
}

export type CompletenessResult = {
  complete: boolean;
  required: RequiredDocumentStatus[];
  missingTypes: StateDocumentType[];
};

/**
 * Check that every applicable required document type has at least one upload.
 */
export function checkRequiredDocumentsComplete(
  config: StateRulesConfig,
  uploadedTypes: Iterable<DocumentType | StateDocumentType>,
  county: string | null | undefined,
): CompletenessResult {
  const uploaded = new Set<string>(
    [...uploadedTypes].map((t) => String(t)),
  );
  const applicable = getApplicableRequiredDocuments(config, county);

  const required: RequiredDocumentStatus[] = applicable.map((rule) => {
    const uploadedForType = uploaded.has(rule.type);
    return {
      type: rule.type,
      label: rule.label,
      notes: rule.notes,
      required: true,
      uploaded: uploadedForType,
      documentIds: [],
    };
  });

  const missingTypes = required
    .filter((r) => !r.uploaded)
    .map((r) => r.type);

  return {
    complete: missingTypes.length === 0,
    required,
    missingTypes,
  };
}

/**
 * Build required-document status rows including linked document ids.
 */
export function buildRequiredDocumentStatus(
  config: StateRulesConfig,
  documents: { id: string; type: DocumentType | StateDocumentType }[],
  county: string | null | undefined,
): CompletenessResult {
  const byType = new Map<string, string[]>();
  for (const doc of documents) {
    const key = String(doc.type);
    const list = byType.get(key) ?? [];
    list.push(doc.id);
    byType.set(key, list);
  }

  const applicable = getApplicableRequiredDocuments(config, county);
  const required: RequiredDocumentStatus[] = applicable.map((rule) => {
    const ids = byType.get(rule.type) ?? [];
    return {
      type: rule.type,
      label: rule.label,
      notes: rule.notes,
      required: true,
      uploaded: ids.length > 0,
      documentIds: ids,
    };
  });

  const missingTypes = required
    .filter((r) => !r.uploaded)
    .map((r) => r.type);

  return {
    complete: missingTypes.length === 0,
    required,
    missingTypes,
  };
}

/** Counties listed in any county_list / county_exclude rule (for UI pickers). */
export function countiesFromConfig(config: StateRulesConfig): string[] {
  const set = new Set<string>();
  for (const rule of config.requiredDocuments) {
    if (
      rule.applicability.kind === "county_list" ||
      rule.applicability.kind === "county_exclude"
    ) {
      for (const c of rule.applicability.counties) {
        set.add(c);
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function configNeedsCounty(config: StateRulesConfig): boolean {
  return config.requiredDocuments.some(
    (rule) =>
      rule.required &&
      (rule.applicability.kind === "county_list" ||
        rule.applicability.kind === "county_exclude"),
  );
}
