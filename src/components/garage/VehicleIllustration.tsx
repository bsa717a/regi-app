import Image from "next/image";
import type { RegistrationType } from "@prisma/client";
import {
  illustrationKindFromBodyClass,
  registrationTypeArtUrl,
  type RegistrationIllustrationKind,
} from "@/lib/registrations/illustrations";

const gradients: Record<RegistrationIllustrationKind, string> = {
  suv: "from-teal-600 via-teal-700 to-slate-800",
  pickup: "from-slate-600 via-teal-800 to-slate-900",
  sedan: "from-cyan-600 via-teal-700 to-slate-800",
  van: "from-teal-700 via-slate-700 to-slate-900",
  coupe: "from-emerald-600 via-teal-800 to-slate-900",
  motorcycle: "from-slate-700 via-teal-800 to-slate-950",
  motorhome: "from-amber-700 via-orange-800 to-slate-900",
  trailer: "from-amber-600 via-amber-800 to-slate-900",
  ohv: "from-orange-600 via-orange-800 to-slate-900",
  snowmobile: "from-sky-500 via-sky-700 to-slate-900",
  boat: "from-blue-500 via-blue-700 to-slate-900",
  default: "from-teal-600 via-teal-800 to-slate-900",
};

/** Fallback silhouettes when no photo / type art (body-class only cards). */
function Silhouette({ kind }: { kind: RegistrationIllustrationKind }) {
  switch (kind) {
    case "pickup":
      return (
        <g fill="currentColor">
          <path d="M8 34h52v6H8z" opacity="0.2" />
          <path d="M10 28h18l3-10h16l6 10h9v8H10v-8z" />
          <path d="M32 18h14l4 8H29l3-8z" opacity="0.35" />
          <circle cx="20" cy="38" r="5.5" />
          <circle cx="52" cy="38" r="5.5" />
        </g>
      );
    case "suv":
      return (
        <g fill="currentColor">
          <path d="M8 34h56v6H8z" opacity="0.2" />
          <path d="M10 30c0-2 2-4 4-4h8l4-8h22l6 8h8c2 0 4 2 4 4v6H10v-6z" />
          <path d="M24 18h20l4 8H21l3-8z" opacity="0.35" />
          <circle cx="22" cy="38" r="5.5" />
          <circle cx="54" cy="38" r="5.5" />
        </g>
      );
    case "van":
      return (
        <g fill="currentColor">
          <path d="M8 34h56v6H8z" opacity="0.2" />
          <path d="M10 18h40l12 10v10H10V18z" />
          <path d="M18 20h28v8H18z" opacity="0.35" />
          <circle cx="22" cy="38" r="5.5" />
          <circle cx="52" cy="38" r="5.5" />
        </g>
      );
    case "motorcycle":
      return (
        <g fill="currentColor">
          <circle cx="18" cy="36" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="54" cy="36" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M24 34c4-10 10-14 18-14l6 6-4 8H28z" />
          <path d="M30 22l6-8 4 2-4 8z" />
        </g>
      );
    case "motorhome":
      return (
        <g fill="currentColor">
          <path d="M8 34h56v6H8z" opacity="0.2" />
          <path d="M10 20h38l4 8h14v10H10V20z" />
          <path d="M14 24h10v6H14z" opacity="0.35" />
          <circle cx="22" cy="38" r="5.5" />
          <circle cx="52" cy="38" r="5.5" />
        </g>
      );
    case "coupe":
      return (
        <g fill="currentColor">
          <path d="M8 34h56v6H8z" opacity="0.2" />
          <path d="M8 30h8l6-10h24l10 10h8v6H8v-6z" />
          <path d="M24 20h20l6 8H20l4-8z" opacity="0.35" />
          <circle cx="22" cy="38" r="5.5" />
          <circle cx="52" cy="38" r="5.5" />
        </g>
      );
    case "trailer":
      return (
        <g fill="currentColor">
          <path d="M8 18h44v16H8z" />
          <path d="M52 22h8l6 8v4H52V22z" />
          <circle cx="20" cy="38" r="5" />
          <circle cx="40" cy="38" r="5" />
        </g>
      );
    case "ohv":
      return (
        <g fill="currentColor">
          <circle cx="16" cy="36" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="56" cy="36" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M22 34h16l6-10h8l4 8-6 6H24z" />
          <path d="M44 16l8-4 2 3-7 5z" />
        </g>
      );
    case "snowmobile":
      return (
        <g fill="currentColor">
          <path d="M10 36c2-2 8-4 18-4h22c6 0 12 2 14 4l-4 4H14z" />
          <path d="M22 22h20l8 10H28z" />
          <path d="M8 38h56c0 2-4 4-10 4H18c-6 0-10-2-10-4z" opacity="0.55" />
        </g>
      );
    case "boat":
      return (
        <g fill="currentColor">
          <path d="M8 30c4 8 16 12 32 12s28-4 32-12H8z" />
          <path d="M28 14h6v16h-6z" />
          <path d="M34 14l22 12H34V14z" opacity="0.85" />
        </g>
      );
    case "sedan":
    default:
      return (
        <g fill="currentColor">
          <path d="M8 34h56v6H8z" opacity="0.2" />
          <path d="M6 30h10l5-10h26l9 10h10v6H6v-6z" />
          <path d="M23 20h22l5 8H20l3-8z" opacity="0.35" />
          <circle cx="22" cy="38" r="5.5" />
          <circle cx="52" cy="38" r="5.5" />
        </g>
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

  if (registrationType) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-slate-900">
        <Image
          src={registrationTypeArtUrl(registrationType)}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 280px"
          priority={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
      </div>
    );
  }

  const kind = illustrationKindFromBodyClass(bodyClass);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradients[kind]} text-white`}
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
      <svg
        viewBox="0 0 72 48"
        className="relative h-[72%] w-[88%] max-h-24 drop-shadow-sm"
        role="img"
      >
        <title>{label}</title>
        <Silhouette kind={kind} />
      </svg>
    </div>
  );
}
