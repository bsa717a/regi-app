import type { RegistrationType } from "@prisma/client";
import {
  illustrationKindFromBodyClass,
  illustrationKindFromType,
  type RegistrationIllustrationKind,
} from "@/lib/registrations/illustrations";

const gradients: Record<RegistrationIllustrationKind, string> = {
  suv: "from-teal-600 to-slate-700",
  pickup: "from-slate-600 to-teal-800",
  sedan: "from-cyan-700 to-slate-700",
  van: "from-teal-700 to-slate-600",
  coupe: "from-emerald-700 to-slate-700",
  motorcycle: "from-slate-700 to-teal-900",
  trailer: "from-amber-700 to-slate-700",
  ohv: "from-orange-700 to-slate-800",
  snowmobile: "from-sky-700 to-slate-800",
  boat: "from-blue-700 to-slate-800",
  default: "from-teal-700 to-slate-800",
};

function Silhouette({ kind }: { kind: RegistrationIllustrationKind }) {
  switch (kind) {
    case "pickup":
      return (
        <path
          d="M3 14h2l1-4h7l2 4h4v3H3v-3Zm10-4V8h3l2 2h-5Z"
          fill="currentColor"
        />
      );
    case "suv":
      return (
        <path
          d="M3 15h18v2H3v-2Zm1-2 1.5-5h9L17 13H4Zm3-5.5V6h5v1.5"
          fill="currentColor"
        />
      );
    case "van":
      return (
        <path
          d="M3 14h18v3H3v-3Zm1-1 1-6h11l3 6H4Zm3-4h4v2H7v-2Z"
          fill="currentColor"
        />
      );
    case "motorcycle":
      return (
        <path
          d="M5 16a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm14 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8 13l3-4h3l2 2 3 1"
          fill="currentColor"
        />
      );
    case "coupe":
      return (
        <path
          d="M3 14.5h18V17H3v-2.5ZM5 14l2.5-5h6L17 14H5Zm4-3.5h3"
          fill="currentColor"
        />
      );
    case "trailer":
      return (
        <path
          d="M4 15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm12 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 13V9h13l3 3v1"
          fill="currentColor"
        />
      );
    case "ohv":
      return (
        <path
          d="M5 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 14h4l2-4h4"
          fill="currentColor"
        />
      );
    case "snowmobile":
      return (
        <path
          d="M3 15h4l2-3h8l2 3h2M9 12l2-4h4l1 4"
          fill="currentColor"
        />
      );
    case "boat":
      return (
        <path
          d="M4 15h16l-2 3H6l-2-3Zm7-9v6M8 12l3-6 3 6"
          fill="currentColor"
        />
      );
    case "sedan":
    default:
      return (
        <path
          d="M3 14h18v3H3v-3Zm1.5-1 2-5h7l3 5h-12Zm3.5-3h4"
          fill="currentColor"
        />
      );
  }
}

export function VehicleIllustration({
  bodyClass,
  photoUrl,
  label,
  registrationType,
}: {
  bodyClass?: string | null;
  photoUrl?: string | null;
  label: string;
  registrationType?: RegistrationType;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- optional remote URL stub
      <img
        src={photoUrl}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  const kind = registrationType
    ? illustrationKindFromType(registrationType, bodyClass)
    : illustrationKindFromBodyClass(bodyClass);

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradients[kind]} text-white/90`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-16 w-16 opacity-90" role="img">
        <title>{label}</title>
        <Silhouette kind={kind} />
      </svg>
    </div>
  );
}
