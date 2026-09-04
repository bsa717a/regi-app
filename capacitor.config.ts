/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = (
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  "https://app.regireg.com"
).replace(/\/$/, "");

const serverHost = new URL(serverUrl).hostname;

/**
 * Capacitor loads the hosted Next.js app directly so the native bridge
 * (Face ID, Network, Push, etc.) is injected into the WebView.
 *
 * Override for simulator/device debugging:
 *   CAPACITOR_SERVER_URL=http://localhost:8080 npm run cap:sync
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
  experimental: {
    ios: {
      spm: {
        packageOptions: {
          "@capacitor-firebase/messaging": {
            symlink: true,
          },
        },
      },
    },
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
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
