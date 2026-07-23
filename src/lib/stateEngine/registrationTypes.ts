import type {
  FeeStructure,
  RegistrationType,
  RegistrationTypeRules,
  RequiredDocumentRule,
  StateRulesConfig,
} from "@/lib/stateEngine/types";

export function getRegistrationTypeRules(
  config: StateRulesConfig,
  type: RegistrationType,
): RegistrationTypeRules | null {
  return config.registrationTypes.find((entry) => entry.type === type) ?? null;
}

/** Required docs for a type — type override when present, else state defaults. */
export function getRequiredDocumentsForType(
  config: StateRulesConfig,
  type: RegistrationType,
): RequiredDocumentRule[] {
  const typeRules = getRegistrationTypeRules(config, type);
  return typeRules?.requiredDocuments ?? config.requiredDocuments;
}

/** Merge type fee overrides onto state fee defaults. */
export function getFeesForType(
  config: StateRulesConfig,
  type: RegistrationType,
): FeeStructure {
  const typeRules = getRegistrationTypeRules(config, type);
  if (!typeRules?.fees) return config.fees;
  return {
    ...config.fees,
    ...typeRules.fees,
  };
}

export function isValidRegistrationType(
  value: unknown,
): value is RegistrationType {
  return (
    value === "passenger" ||
    value === "motorcycle" ||
    value === "trailer" ||
    value === "ohv" ||
    value === "snowmobile" ||
    value === "boat"
  );
}
