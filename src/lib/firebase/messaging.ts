"use client";

import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase/client";
import { isVapidConfigured } from "@/lib/push/capability";

let messagingPromise: Promise<Messaging | null> | null = null;

/** Lazily obtain Firebase Messaging when the browser + VAPID key support it. */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!isVapidConfigured()) return null;

  if (!messagingPromise) {
    messagingPromise = (async () => {
      try {
        const supported = await isSupported();
        if (!supported) return null;
        return getMessaging(getFirebaseApp());
      } catch (err) {
        console.warn("[FCM] messaging init failed", err);
        return null;
      }
    })();
  }

  return messagingPromise;
}

/**
 * Request notification permission (if needed) and return an FCM token.
 * Returns null when VAPID is blank, unsupported, or permission is denied.
 */
export async function requestFcmToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) return null;

  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return null;
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  try {
    // Prefer the dedicated FCM SW when registered; fall back to default discovery.
    let swReg: ServiceWorkerRegistration | undefined;
    if ("serviceWorker" in navigator) {
      try {
        swReg =
          (await navigator.serviceWorker.getRegistration(
            "/firebase-messaging-sw.js",
          )) ?? undefined;
        if (!swReg) {
          swReg = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
            { scope: "/" },
          );
        }
      } catch (err) {
        console.warn("[FCM] messaging SW registration failed", err);
      }
    }

    const token = await getToken(messaging, {
      vapidKey,
      ...(swReg ? { serviceWorkerRegistration: swReg } : {}),
    });
    return token || null;
  } catch (err) {
    console.warn("[FCM] getToken failed", err);
    return null;
  }
}
