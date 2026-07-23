"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { DEFAULT_SIGNED_IN_HOME } from "@/lib/routes";

export const GARAGE_DOOR_OPEN_MS = 1700;
const PANEL_COUNT = 6;
const PAINT_DELAY_MS = 140;

type GarageDoorRevealValue = {
  /** Full-screen door is covering the app (opening or about to). */
  revealing: boolean;
  /**
   * Cover the app with a closed door before auth state flips so GuestGuard
   * cannot navigate ahead of the reveal sequence.
   */
  armReveal: () => void;
  /** Drop the overlay after a failed sign-in. */
  cancelReveal: () => void;
  /** Navigate to href under a closed door, then scroll the door up to reveal the app. */
  revealTo: (href: string) => void;
};

const GarageDoorRevealContext = createContext<GarageDoorRevealValue | null>(
  null,
);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sectional door built from the reference photo (6 horizontal slices). */
export function GarageDoorPanels({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-full w-full flex-col ${className}`} aria-hidden>
      {Array.from({ length: PANEL_COUNT }, (_, i) => {
        const positionY = `${(i / (PANEL_COUNT - 1)) * 100}%`;
        return (
          <div
            key={i}
            className="relative flex-1"
            style={{
              backgroundImage: "url(/images/garage-door.png)",
              backgroundSize: `100% ${PANEL_COUNT * 100}%`,
              backgroundPosition: `center ${positionY}`,
              backgroundRepeat: "no-repeat",
            }}
          />
        );
      })}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_30%_0%,_rgba(255,255,255,0.1)_0%,_transparent_55%),radial-gradient(ellipse_at_70%_0%,_rgba(255,255,255,0.1)_0%,_transparent_55%)]" />
    </div>
  );
}

function GarageDoorOverlay({ open }: { open: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
      role="presentation"
      aria-hidden
    >
      <div
        className={`garage-door absolute inset-0 will-change-transform ${
          open ? "garage-door-open" : ""
        }`}
      >
        <GarageDoorPanels className="absolute inset-0" />
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-amber-400/90 shadow-[0_0_24px_6px_rgba(251,191,36,0.55)] transition-opacity duration-500 ${
            open ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>
      <p className="sr-only">Opening garage. Loading your app.</p>
    </div>
  );
}

export function GarageDoorRevealProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  const armReveal = useCallback(() => {
    if (prefersReducedMotion()) return;
    flushSync(() => {
      setOpen(false);
      setActive(true);
    });
  }, []);

  const cancelReveal = useCallback(() => {
    setActive(false);
    setOpen(false);
  }, []);

  const revealTo = useCallback(
    (href: string) => {
      const safe =
        href.startsWith("/") && !href.startsWith("//") ? href : DEFAULT_SIGNED_IN_HOME;

      if (prefersReducedMotion()) {
        cancelReveal();
        router.replace(safe);
        return;
      }

      // Ensure the closed door is painted (no-op if armReveal already ran).
      flushSync(() => {
        setOpen(false);
        setActive(true);
      });

      router.replace(safe);

      window.setTimeout(() => {
        setOpen(true);
      }, PAINT_DELAY_MS);

      window.setTimeout(() => {
        setActive(false);
        setOpen(false);
      }, PAINT_DELAY_MS + GARAGE_DOOR_OPEN_MS);
    },
    [cancelReveal, router],
  );

  const value = useMemo(
    () => ({ revealing: active, armReveal, cancelReveal, revealTo }),
    [active, armReveal, cancelReveal, revealTo],
  );

  return (
    <GarageDoorRevealContext.Provider value={value}>
      {children}
      {active ? <GarageDoorOverlay open={open} /> : null}
    </GarageDoorRevealContext.Provider>
  );
}

export function useGarageDoorReveal(): GarageDoorRevealValue {
  const ctx = useContext(GarageDoorRevealContext);
  if (!ctx) {
    return {
      revealing: false,
      armReveal: () => undefined,
      cancelReveal: () => undefined,
      revealTo: () => undefined,
    };
  }
  return ctx;
}
