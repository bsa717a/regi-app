import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firebase Messaging background SW with public client config injected from env.
 * Served at `/firebase-messaging-sw.js` via next.config rewrite.
 */
export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const body = `/* REGI — Firebase Cloud Messaging background SW */
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    "REGI";
  const bodyText =
    (payload.notification && payload.notification.body) ||
    (payload.data && payload.data.body) ||
    "You have a registration reminder.";
  self.registration.showNotification(title, {
    body: bodyText,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: Object.assign({ url: "/garage" }, payload.data || {}),
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/garage";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(target);
        }
      }),
  );
});
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
