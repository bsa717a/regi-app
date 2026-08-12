import { Capacitor } from "@capacitor/core";

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

function readNativeFromWindow(): boolean {
  if (typeof window === "undefined") return false;
  const injected = (window as CapacitorWindow).Capacitor;
  if (typeof injected?.isNativePlatform === "function") {
    return injected.isNativePlatform();
  }
  return Capacitor.isNativePlatform();
}

/** True when running inside the Capacitor iOS/Android shell (not Safari/PWA). */
export function isNativeApp(): boolean {
  return readNativeFromWindow();
}

/** Capacitor platform id: `ios` | `android` | `web`. */
export function nativePlatform(): string {
  if (typeof window !== "undefined") {
    const injected = (window as CapacitorWindow).Capacitor;
    if (typeof injected?.getPlatform === "function") {
      return injected.getPlatform();
    }
  }
  return Capacitor.getPlatform();
}
