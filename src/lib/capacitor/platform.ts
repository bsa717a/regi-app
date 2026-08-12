import { Capacitor } from "@capacitor/core";

/** True when running inside the Capacitor iOS/Android shell (not Safari/PWA). */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Capacitor platform id: `ios` | `android` | `web`. */
export function nativePlatform(): string {
  return Capacitor.getPlatform();
}
