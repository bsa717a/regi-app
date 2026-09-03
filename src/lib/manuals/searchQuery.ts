import type { RegistrationType } from "@prisma/client";

export function manualDocumentLabel(type: RegistrationType): string {
  switch (type) {
    case "motorhome":
      return "RV / motorhome owner's manual";
    case "motorcycle":
      return "motorcycle owner's manual";
    case "snowmobile":
      return "snowmobile owner's manual";
    case "ohv":
      return "OHV / ATV / UTV owner's manual";
    case "boat":
      return "boat owner's manual";
    case "trailer":
      return "trailer owner's manual";
    default:
      return "owner's manual";
  }
}

/** Web search query tuned to the registration category. */
export function buildManualSearchQuery(input: {
  type: RegistrationType;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  const ymm = [input.year, input.make, input.model].filter(Boolean).join(" ");
  const docLabel = manualDocumentLabel(input.type);

  switch (input.type) {
    case "motorhome":
      return `${ymm} ${docLabel} pdf`.trim();
    case "motorcycle":
      return `${ymm} motorcycle owner's manual pdf`.trim();
    case "snowmobile":
      return `${ymm} snowmobile owner's manual pdf`.trim();
    case "ohv":
      return `${ymm} ATV UTV owner's manual pdf`.trim();
    case "boat":
      return `${ymm} boat owner's manual pdf`.trim();
    case "trailer":
      return `${ymm} trailer owner's manual pdf`.trim();
    default:
      return `${ymm} owner manual pdf`.trim();
  }
}
