export const EMPTY_GARAGE_ART = {
  light: "/images/garage/empty-bay-light.webp",
  dark: "/images/garage/empty-bay-dark.webp",
} as const;

const ALT = "Empty garage bay ready for a first registration";

/**
 * Soft painted empty-bay WebP (never SVG). Light + dark; `.dark` shows dusk.
 * No dashed stall lines, ghost vehicle, or wall doodads.
 */
export function GarageEmptyIllustration({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-testid="garage-empty-illustration"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- public WebP; Vite evidence harness cannot use next/image */}
      <img
        src={EMPTY_GARAGE_ART.light}
        alt={ALT}
        className="h-full w-full object-cover dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- public WebP; Vite evidence harness cannot use next/image */}
      <img
        src={EMPTY_GARAGE_ART.dark}
        alt={ALT}
        className="hidden h-full w-full object-cover dark:block"
      />
    </div>
  );
}
