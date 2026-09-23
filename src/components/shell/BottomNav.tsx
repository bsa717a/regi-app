"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/garage", label: "Garage", icon: GarageIcon },
  { href: "/renewals", label: "Renewals", icon: RenewalsIcon },
  { href: "/documents", label: "Docs", icon: DocumentsIcon, ariaLabel: "Documents" },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function navActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavBar({
  activeHref,
  onNavigate,
}: {
  activeHref: string;
  onNavigate?: (href: string) => void;
}) {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-20 border-t border-regi-line bg-regi-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => {
          const active =
            activeHref === item.href || activeHref.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const ariaLabel = "ariaLabel" in item ? item.ariaLabel : item.label;
          const className = `flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1 px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-regi-accent ${
            active ? "text-regi-text" : "text-regi-muted"
          }`;
          const body = (
            <>
              <span className="relative flex h-6 items-center justify-center">
                {active ? (
                  <span
                    className="absolute -top-1.5 h-1.5 w-1.5 rounded-full bg-regi-accent"
                    aria-hidden
                  />
                ) : null}
                <Icon />
              </span>
              <span className="font-regi-data text-[10px] font-bold tracking-[0.14em] uppercase">
                {item.label}
              </span>
            </>
          );
          return (
            <li key={item.href}>
              {onNavigate ? (
                <button
                  type="button"
                  className={className}
                  aria-current={active ? "page" : undefined}
                  aria-label={ariaLabel}
                  onClick={() => onNavigate(item.href)}
                >
                  {body}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={className}
                  aria-current={active ? "page" : undefined}
                  aria-label={ariaLabel}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const active =
    items.find((item) => navActive(pathname, item.href))?.href ?? "/garage";
  return <BottomNavBar activeHref={active} />;
}

function GarageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RenewalsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12a8 8 0 1 1-2.2-5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 4v4h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.5M17.5 16l1.6 1.5M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.5M17.5 8l1.6-1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
