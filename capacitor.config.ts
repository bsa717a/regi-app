import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  "https://regi-90502049802.us-central1.run.app"
).replace(/\/$/, "");

const serverHost = new URL(serverUrl).hostname;

/**
 * Capacitor loads the hosted Next.js app directly so the native bridge
 * (Face ID, Network, Push, etc.) is injected into the WebView.
 *
 * Override for simulator/device debugging:
 *   CAPACITOR_SERVER_URL=http://127.0.0.1:8080 npm run cap:sync
 */
const config: CapacitorConfig = {
  appId: "app.regi.ios",
  appName: "REGI",
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    allowNavigation: [serverHost],
    cleartext: serverUrl.startsWith("http://"),
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
