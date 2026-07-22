export type VehicleIllustrationKind =
  | "suv"
  | "pickup"
  | "sedan"
  | "van"
  | "coupe"
  | "motorcycle"
  | "default";

export function illustrationKindFromBodyClass(
  bodyClass: string | null | undefined,
): VehicleIllustrationKind {
  const value = (bodyClass ?? "").toLowerCase();

  if (!value) return "default";
  if (value.includes("motor")) return "motorcycle";
  if (value.includes("pickup") || value.includes("truck")) return "pickup";
  if (
    value.includes("sport utility") ||
    value.includes("mpv") ||
    value.includes("crossover") ||
    /\bsuv\b/.test(value)
  ) {
    return "suv";
  }
  if (value.includes("van") || value.includes("minivan")) return "van";
  if (value.includes("coupe") || value.includes("convertible")) return "coupe";
  if (
    value.includes("sedan") ||
    value.includes("saloon") ||
    value.includes("hatchback") ||
    value.includes("wagon")
  ) {
    return "sedan";
  }

  return "default";
}

export function titleCaseMakeModel(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/([\s-/]+)/)
    .map((part) => {
      if (/^[\s-/]+$/.test(part)) return part;
      if (part.length <= 3 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}
