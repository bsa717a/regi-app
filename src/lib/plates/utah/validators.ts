import { getUtahPlateType } from "./plateTypes";
import type {
  PlateComboValidation,
  PlateSoftWarning,
  UtahPlateTypeId,
} from "./types";

const ALLOWED_CHAR = /[A-Z0-9 ]/;
const DISALLOWED_CHAR = /[^A-Z0-9 ]/;

/** Soft content cues from Utah DMV “offensive to good taste and decency” guidance. */
const SOFT_CONTENT_PATTERNS: Array<{
  id: string;
  pattern: RegExp;
  message: string;
}> = [
  {
    id: "vulgar",
    pattern:
      /F+U+C+K+|S+H+I+T+|B+I+T+C+H+|A+S+S+H+O+L+|C+U+N+T+|D+I+C+K+|P+U+S+S+Y+|F+A+G+|N+I+G+G+/,
    message:
      "This may be read as vulgar or derogatory language. Utah can reject combinations that are offensive to good taste and decency.",
  },
  {
    id: "drugs",
    pattern: /COCAIN|HEROIN|FENTAN|METH(?![A-Z])|WEED|420|XTC|MDMA|KUSH/,
    message:
      "This may reference drugs. Utah generally prohibits drug-related combinations.",
  },
  {
    id: "sexual",
    pattern: /SEX|PORN|XXX|ORGY|ANAL|PENIS|VAGIN|BOOBS/,
    message:
      "This may reference sexual acts or anatomy. Utah can reject that content.",
  },
  {
    id: "hate-slur",
    pattern: /KIKE|SPIC|WETBACK|REDTARD|FAGGOT/,
    message:
      "This may express contempt toward a protected group. Utah can reject disparaging combinations.",
  },
  {
    id: "endangerment",
    pattern: /BOMB|TERROR|KILLER|MURDER|SHOOT/,
    message:
      "This may suggest endangerment or violence. Utah can reject combinations that endanger public welfare.",
  },
];

const SEQUENTIAL_LIKE = /^[A-Z]{3}[0-9]{3,4}$/;

export function normalizePlateCombo(raw: string): string {
  return raw.toUpperCase();
}

export function plateComboCharacterCount(value: string): number {
  return value.trimEnd().length;
}

export function validatePlateCombo(
  raw: string,
  plateTypeId: UtahPlateTypeId,
): PlateComboValidation {
  const value = normalizePlateCombo(raw).trim();
  if (!value) {
    return {
      ok: false,
      error: "Enter a combination of letters and numbers.",
    };
  }

  if (DISALLOWED_CHAR.test(value)) {
    return {
      ok: false,
      error:
        "Letters and numbers only — punctuation and special characters are not allowed.",
    };
  }

  if (![...value].some((ch) => ALLOWED_CHAR.test(ch) && ch !== " ")) {
    return {
      ok: false,
      error: "Enter at least one letter or number.",
    };
  }

  const { maxCharacters } = getUtahPlateType(plateTypeId);
  if (value.length > maxCharacters) {
    return {
      ok: false,
      error: `This plate type allows up to ${maxCharacters} characters, including spaces.`,
    };
  }

  return { ok: true, value };
}

export function validatePlateCombos(
  rawCombos: string[],
  plateTypeId: UtahPlateTypeId,
):
  | { ok: true; values: string[] }
  | { ok: false; errors: Array<string | null> } {
  const errors: Array<string | null> = [null, null, null];
  const values: string[] = [];
  let hasError = false;

  rawCombos.slice(0, 3).forEach((raw, index) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (index === 0) {
        errors[index] = "Enter at least one combination.";
        hasError = true;
      }
      return;
    }
    const result = validatePlateCombo(raw, plateTypeId);
    if (!result.ok) {
      errors[index] = result.error;
      hasError = true;
      return;
    }
    if (values.includes(result.value)) {
      errors[index] = "Each choice should be different.";
      hasError = true;
      return;
    }
    values.push(result.value);
  });

  if (hasError) return { ok: false, errors };
  if (values.length === 0) {
    errors[0] = "Enter at least one combination.";
    return { ok: false, errors };
  }
  return { ok: true, values };
}

export function softContentWarnings(raw: string): PlateSoftWarning[] {
  const compact = normalizePlateCombo(raw).replace(/ /g, "");
  if (!compact) return [];

  const warnings: PlateSoftWarning[] = [];
  for (const rule of SOFT_CONTENT_PATTERNS) {
    if (rule.pattern.test(compact)) {
      warnings.push({ id: rule.id, message: rule.message });
    }
  }

  const trimmed = normalizePlateCombo(raw).trim();
  if (SEQUENTIAL_LIKE.test(trimmed)) {
    warnings.push({
      id: "sequential-like",
      message:
        "This looks like a regular-issue letter/number series. Utah may reject combinations that conflict with standard plates.",
    });
  }

  return warnings;
}

export function collectSoftWarnings(combos: string[]): PlateSoftWarning[] {
  const seen = new Set<string>();
  const warnings: PlateSoftWarning[] = [];
  for (const combo of combos) {
    for (const warning of softContentWarnings(combo)) {
      const key = `${warning.id}:${combo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      warnings.push({
        id: warning.id,
        message: `${combo}: ${warning.message}`,
      });
    }
  }
  return warnings;
}

export function validatePlateMeaning(raw: string): PlateComboValidation {
  const value = raw.trim();
  if (value.length < 2) {
    return {
      ok: false,
      error: "Add a short explanation of what your combination means.",
    };
  }
  return { ok: true, value };
}
