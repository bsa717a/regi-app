import type { UtahPlatePreview } from "@/lib/plates/utah";

export function UtahPlatePreviewImage({
  preview,
  characters,
  compact = false,
}: {
  preview: UtahPlatePreview;
  characters?: string;
  compact?: boolean;
}) {
  const overlay = characters?.trim() ?? "";

  return (
    <span
      className={`relative block overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700 ${
        compact ? "max-w-xs" : "w-full"
      }`}
    >
      {/* Official DMV catalog PNGs in public/plates — next/image not required. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview.src}
        alt={preview.alt}
        width={preview.width}
        height={preview.height}
        className="h-auto w-full"
      />
      {overlay ? (
        <span
          className="absolute inset-x-[7%] top-[34%] flex h-[38%] items-center justify-center"
          aria-hidden
        >
          <span className="max-w-full truncate rounded-md bg-white/90 px-2 py-0.5 font-mono text-[clamp(1rem,5.4vw,1.7rem)] font-black tracking-[0.16em] text-slate-900 shadow-sm dark:bg-slate-950/80 dark:text-white">
            {overlay}
          </span>
        </span>
      ) : null}
    </span>
  );
}
