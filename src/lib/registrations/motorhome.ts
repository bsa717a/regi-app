export const MOTORHOME_CLASSES = ["A", "B", "C"] as const;

export type MotorhomeClass = (typeof MOTORHOME_CLASSES)[number];

export const MOTORHOME_CLASS_LABELS: Record<MotorhomeClass, string> = {
  A: "Class A (bus-style)",
  B: "Class B (camper van)",
  C: "Class C (cab-over)",
};

export function isValidMotorhomeClass(
  value: unknown,
): value is MotorhomeClass {
  return (
    typeof value === "string" &&
    (MOTORHOME_CLASSES as readonly string[]).includes(value)
  );
}

export function formatMotorhomeClass(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (isValidMotorhomeClass(value)) {
    return MOTORHOME_CLASS_LABELS[value];
  }
  return `Class ${value}`;
}
