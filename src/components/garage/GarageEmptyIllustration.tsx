/**
 * Theme-aware empty-garage SVG (no people, not a photo).
 * Light/dark fills use REGI teal + slate tokens — solid Tailwind classes,
 * not gradient stop-color, so `.dark` reliably flips the palette.
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
      <svg
        viewBox="0 0 400 240"
        className="h-full w-full"
        role="img"
        aria-labelledby="garage-empty-illustration-title"
      >
        <title id="garage-empty-illustration-title">
          Empty garage bay ready for a first registration
        </title>
        <desc>
          An open garage with an empty parking stall, a faint vehicle outline,
          and a blank plate on the wall.
        </desc>

        {/* Interior wash */}
        <rect
          width="400"
          height="240"
          className="fill-slate-100 dark:fill-slate-950"
        />

        {/* Daylight through the open door */}
        <rect
          x="78"
          y="36"
          width="244"
          height="110"
          className="fill-teal-100 dark:fill-teal-950"
        />
        <ellipse
          cx="200"
          cy="72"
          rx="78"
          ry="24"
          className="fill-white/60 dark:fill-teal-200/15"
        />

        {/* Kick plate / back wall under the opening */}
        <rect
          x="78"
          y="128"
          width="244"
          height="18"
          className="fill-slate-200 dark:fill-slate-700"
        />

        {/* Left wall */}
        <path
          d="M0 18 L78 36 L78 146 L0 240 Z"
          className="fill-slate-200 dark:fill-slate-800"
        />
        <path
          d="M0 18 L78 36 L78 48 L0 36 Z"
          className="fill-slate-300/90 dark:fill-slate-700"
        />

        {/* Right wall */}
        <path
          d="M400 18 L322 36 L322 146 L400 240 Z"
          className="fill-slate-200 dark:fill-slate-800"
        />
        <path
          d="M400 18 L322 36 L322 48 L400 36 Z"
          className="fill-slate-300/90 dark:fill-slate-700"
        />

        {/* Concrete floor */}
        <path
          d="M78 146 L322 146 L400 240 L0 240 Z"
          className="fill-slate-200 dark:fill-slate-800"
        />
        <path
          d="M96 146 L304 146 L336 204 L64 204 Z"
          className="fill-teal-50/90 dark:fill-teal-950/55"
        />

        {/* Parking stall */}
        <g
          fill="none"
          className="stroke-teal-700/55 dark:stroke-teal-300/65"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M130 226 L160 160" strokeDasharray="7 6" />
          <path d="M270 226 L240 160" strokeDasharray="7 6" />
          <path d="M160 160 H240" />
        </g>

        {/* Ghost vehicle — top-down sedan in the stall */}
        <g
          fill="none"
          className="stroke-teal-800/70 dark:stroke-teal-100/80"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="5 4"
        >
          <path d="M186 174 C186 168 191 166 200 166 C209 166 214 168 214 174 L218 206 C218 214 211 218 200 218 C189 218 182 214 182 206 Z" />
          <path d="M190 178 H210" />
          <path d="M188 208 H212" />
        </g>
        <g
          className="fill-teal-800/25 dark:fill-teal-100/20"
        >
          <rect x="176" y="180" width="5" height="12" rx="1.5" />
          <rect x="219" y="180" width="5" height="12" rx="1.5" />
          <rect x="176" y="198" width="5" height="12" rx="1.5" />
          <rect x="219" y="198" width="5" height="12" rx="1.5" />
        </g>

        {/* Door frame */}
        <path
          d="M72 32 H328 V146 H322 V38 H78 V146 H72 Z"
          className="fill-teal-800 dark:fill-teal-500"
        />

        {/* Sectional door stacked open at the header */}
        <g>
          <rect
            x="74"
            y="12"
            width="252"
            height="22"
            rx="3"
            className="fill-teal-700 dark:fill-teal-400"
          />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x="80"
              y={16 + i * 5}
              width="240"
              height="3"
              rx="1"
              className="fill-teal-950/30 dark:fill-teal-950/45"
            />
          ))}
          <rect
            x="188"
            y="17"
            width="24"
            height="6"
            rx="1.5"
            className="fill-amber-300 dark:fill-amber-200"
          />
        </g>

        {/* Blank plate on the left wall */}
        <g transform="translate(18 88)">
          <rect
            x="0"
            y="0"
            width="46"
            height="26"
            rx="4"
            className="fill-white dark:fill-slate-900"
          />
          <rect
            x="0"
            y="0"
            width="46"
            height="26"
            rx="4"
            className="fill-none stroke-teal-700 dark:stroke-teal-300"
            strokeWidth="2"
          />
          <rect
            x="7"
            y="8"
            width="32"
            height="10"
            rx="2"
            className="fill-none stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </g>

        {/* Empty hook on the right wall */}
        <g transform="translate(354 96)">
          <path
            d="M10 0 v14"
            className="stroke-slate-500 dark:stroke-slate-400"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="10"
            cy="16"
            r="3"
            className="fill-none stroke-slate-500 dark:stroke-slate-400"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}
