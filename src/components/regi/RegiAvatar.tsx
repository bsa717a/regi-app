"use client";

import { REGI_AVATAR_IMAGES } from "@/lib/regi/constants";

export function RegiAvatar({
  src = REGI_AVATAR_IMAGES[0],
  size = "md",
  className = "",
}: {
  src?: string;
  size?: "sm" | "md" | "float";
  className?: string;
}) {
  const sizes = {
    sm: "h-14 w-14",
    md: "h-16 w-16",
    float: "h-[5rem] w-[5rem]",
  } as const;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.35)] ring-2 ring-white/90 dark:ring-slate-700 ${sizes[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute left-1/2 top-[4%] h-[96%] w-[96%] -translate-x-1/2 object-contain object-top"
      />
    </div>
  );
}
