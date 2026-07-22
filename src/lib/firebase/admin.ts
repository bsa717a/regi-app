import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  // Env files often store newlines as the literal sequence \n
  return key.replace(/\\n/g, "\n");
}

function initAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  // Falls back to ADC / GOOGLE_APPLICATION_CREDENTIALS when present
  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId || process.env.GCP_PROJECT_ID,
  });
}

let adminApp: App | undefined;

export function getFirebaseAdminApp(): App {
  if (!adminApp) {
    adminApp = initAdminApp();
  }
  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminMessaging(): Messaging {
  return getMessaging(getFirebaseAdminApp());
}
