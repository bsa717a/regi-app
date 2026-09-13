/**
 * Theme-aware empty-garage SVG (no people, not a photo).
 * Light/dark fills follow REGI teal + slate tokens used by AppShell empty states.
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

        <defs>
          <linearGradient
            id="garage-empty-sky"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              className="[stop-color:#99f6e4] dark:[stop-color:#115e59]"
            />
            <stop
              offset="100%"
              className="[stop-color:#e0f2fe] dark:[stop-color:#0f172a]"
            />
          </linearGradient>
          <linearGradient
            id="garage-empty-floor"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              className="[stop-color:#cbd5e1] dark:[stop-color:#1e293b]"
            />
            <stop
              offset="100%"
              className="[stop-color:#e2e8f0] dark:[stop-color:#0f172a]"
            />
          </linearGradient>
          <linearGradient
            id="garage-empty-daylight"
            x1="0.5"
            y1="0"
            x2="0.5"
            y2="1"
          >
            <stop
              offset="0%"
              className="[stop-color:#ecfdf5] dark:[stop-color:#042f2e]"
            />
            <stop
              offset="70%"
              stopOpacity="0"
              className="[stop-color:#ecfdf5] dark:[stop-color:#042f2e]"
            />
          </linearGradient>
        </defs>

        {/* Interior wash */}
        <rect
          width="400"
          height="240"
          className="fill-slate-100 dark:fill-slate-900"
        />

        {/* Daylight through the open door */}
        <rect x="78" y="36" width="244" height="104" fill="url(#garage-empty-sky)" />
        <ellipse
          cx="200"
          cy="70"
          rx="70"
          ry="22"
          className="fill-white/50 dark:fill-teal-200/10"
        />

        {/* Back wall under the opening */}
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
          className="fill-slate-300/80 dark:fill-slate-700"
        />

        {/* Right wall */}
        <path
          d="M400 18 L322 36 L322 146 L400 240 Z"
          className="fill-slate-200 dark:fill-slate-800"
        />
        <path
          d="M400 18 L322 36 L322 48 L400 36 Z"
          className="fill-slate-300/80 dark:fill-slate-700"
        />

        {/* Concrete floor */}
        <path
          d="M78 146 L322 146 L400 240 L0 240 Z"
          fill="url(#garage-empty-floor)"
        />

        {/* Soft daylight on the floor */}
        <path
          d="M96 146 L304 146 L340 210 L60 210 Z"
          fill="url(#garage-empty-daylight)"
        />

        {/* Parking stall */}
        <g
          fill="none"
          className="stroke-teal-700/45 dark:stroke-teal-300/40"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M128 228 L158 158" strokeDasharray="7 6" />
          <path d="M272 228 L242 158" strokeDasharray="7 6" />
          <path d="M158 158 H242" />
        </g>

        {/* Ghost vehicle — sedan silhouette, dashed, no people */}
        <g
          transform="translate(146 154) scale(1.5)"
          className="fill-teal-700/15 stroke-teal-700/50 dark:fill-teal-200/10 dark:stroke-teal-200/45"
          strokeWidth="1.4"
          strokeDasharray="3.5 2.8"
          strokeLinejoin="round"
        >
          <path d="M6 22h56v4H6z" />
          <path d="M6 18h8l5-8h26l7 8h8v5H6v-5z" />
          <path d="M20 11h20l4 6H17l3-6z" />
          <circle cx="20" cy="24" r="3.6" className="fill-none" />
          <circle cx="52" cy="24" r="3.6" className="fill-none" />
        </g>

        {/* Door frame */}
        <path
          d="M72 32 H328 V146 H322 V38 H78 V146 H72 Z"
          className="fill-teal-800 dark:fill-teal-600"
        />

        {/* Sectional door stacked open at the header */}
        <g>
          <rect
            x="74"
            y="12"
            width="252"
            height="22"
            rx="3"
            className="fill-teal-700 dark:fill-teal-500"
          />
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x="80"
              y={16 + i * 5}
              width="240"
              height="3"
              rx="1"
              className="fill-teal-900/35 dark:fill-teal-950/40"
            />
          ))}
          <rect
            x="188"
            y="17"
            width="24"
            height="6"
            rx="1.5"
            className="fill-amber-300/90 dark:fill-amber-200"
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
            strokeWidth="2"
          />
          <rect
            x="0"
            y="0"
            width="46"
            height="26"
            rx="4"
            className="fill-none stroke-teal-700 dark:stroke-teal-400"
            strokeWidth="2"
          />
          <rect
            x="7"
            y="8"
            width="32"
            height="10"
            rx="2"
            className="fill-none stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </g>

        {/* Empty hook / peg on the right wall */}
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
