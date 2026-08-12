import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor loads the hosted Next.js app (Cloud Run). The local webDir is only
 * a bootstrap / offline shell — API + UI live on the server URL.
 */
const config: CapacitorConfig = {
  appId: "app.regi.ios",
  appName: "REGI",
  webDir: "capacitor-www",
  server: {
    // Production Cloud Run. Override for device debugging, e.g.:
    // CAPACITOR_SERVER_URL=http://192.168.1.20:8080 npx cap sync ios
    url:
      process.env.CAPACITOR_SERVER_URL?.trim() ||
      "https://regi-90502049802.us-central1.run.app",
    cleartext: process.env.CAPACITOR_SERVER_URL?.startsWith("http://") === true,
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
