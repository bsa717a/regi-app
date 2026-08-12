import { isNativeApp, nativePlatform } from "@/lib/capacitor/platform";

export type ClientPushPlatform = "web" | "ios" | "android";

export type DevicePushToken = {
  token: string;
  platform: ClientPushPlatform;
};

/**
 * Obtain an FCM registration token for the current client.
 * Native iOS/Android uses @capacitor-firebase/messaging; web uses VAPID + SW.
 */
export async function requestDevicePushToken(): Promise<DevicePushToken | null> {
  if (isNativeApp()) {
    return requestNativeFcmToken();
  }

  const { requestFcmToken } = await import("@/lib/firebase/messaging");
  const token = await requestFcmToken();
  if (!token) return null;
  return { token, platform: "web" };
}

async function requestNativeFcmToken(): Promise<DevicePushToken | null> {
  try {
    const { FirebaseMessaging } = await import(
      "@capacitor-firebase/messaging"
    );

    const permission = await FirebaseMessaging.checkPermissions();
    let receive = permission.receive;
    if (receive === "prompt" || receive === "prompt-with-rationale") {
      const requested = await FirebaseMessaging.requestPermissions();
      receive = requested.receive;
    }
    if (receive !== "granted") return null;

    const { token } = await FirebaseMessaging.getToken();
    if (!token?.trim()) return null;

    const platform: ClientPushPlatform =
      nativePlatform() === "android" ? "android" : "ios";
    return { token: token.trim(), platform };
  } catch {
    return null;
  }
}
